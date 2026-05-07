import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { file_url, competencia, orgao_tipo } = await req.json();

    if (!file_url || !competencia) {
      return new Response(JSON.stringify({ error: "file_url e competencia são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the xlsx file
    console.log(`Fetching file from: ${file_url}`);
    const fileResp = await fetch(file_url);
    if (!fileResp.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch file: ${fileResp.status}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await fileResp.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: "array" });
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    console.log(`Total rows in xlsx: ${rows.length}`);

    // Find header row
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      if (row && row.some((c: any) => String(c).includes("Nome"))) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      return new Response(JSON.stringify({ error: "Header row not found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = rows[headerIdx].map((h: any) => String(h).trim());
    const nomeIdx = headers.indexOf("Nome");
    const cargoIdx = headers.indexOf("Cargo");
    const proventosIdx = headers.findIndex((h: string) => h.includes("Total proventos") || h.includes("proventos"));
    const descontosIdx = headers.findIndex((h: string) => h.includes("desc") || h.includes("Descontos") || h.includes("obrigatórios"));

    console.log(`Header indices - Nome: ${nomeIdx}, Cargo: ${cargoIdx}, Proventos: ${proventosIdx}, Descontos: ${descontosIdx}`);

    if (nomeIdx === -1 || proventosIdx === -1) {
      return new Response(JSON.stringify({ error: "Required columns not found", headers }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse data rows
    interface FolhaRow {
      nome: string;
      cargo: string;
      total_proventos: number;
      total_descontos: number;
    }

    const parseMoney = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === "number") return val;
      const str = String(val);
      return parseFloat(str.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) || 0;
    };

    const registros: FolhaRow[] = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;
      
      const nome = row[nomeIdx] ? String(row[nomeIdx]).trim() : "";
      const cargo = cargoIdx >= 0 && row[cargoIdx] ? String(row[cargoIdx]).trim() : "";
      const total_proventos = parseMoney(row[proventosIdx]);
      const total_descontos = descontosIdx >= 0 ? parseMoney(row[descontosIdx]) : 0;

      if (nome && total_proventos > 0) {
        registros.push({ nome, cargo, total_proventos, total_descontos });
      }
    }

    console.log(`Parsed ${registros.length} records with proventos > 0`);

    // Aggregate per person
    const agg = new Map<string, { cargo: string; bruto: number; descontos: number }>();
    for (const r of registros) {
      const existing = agg.get(r.nome);
      if (!existing) {
        agg.set(r.nome, { cargo: r.cargo, bruto: r.total_proventos, descontos: r.total_descontos });
      } else {
        existing.bruto += r.total_proventos;
        existing.descontos += r.total_descontos;
        if (!existing.cargo && r.cargo && r.cargo !== "-") existing.cargo = r.cargo;
      }
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Upsert servidores
    const BATCH = 200;
    const entries = [...agg.entries()];
    let servidoresAtualizados = 0;

    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH).map(([nome, d]) => ({
        nome, cargo: d.cargo || null, orgao_tipo: orgao_tipo || "prefeitura",
        fonte_url: "importação manual - planilha fev/2026",
      }));
      const { error } = await sb.from("servidores").upsert(batch, { onConflict: "nome" });
      if (error) console.error(`Srv batch ${i}: ${error.message}`);
      else servidoresAtualizados += batch.length;
    }

    // Fetch servidor IDs
    const dbSrvs: { id: string; nome: string }[] = [];
    let offset = 0;
    while (true) {
      const { data: page } = await sb.from("servidores").select("id, nome")
        .eq("orgao_tipo", orgao_tipo || "prefeitura").range(offset, offset + 999);
      if (!page || page.length === 0) break;
      dbSrvs.push(...page);
      if (page.length < 1000) break;
      offset += 1000;
    }
    const nameMap = new Map(dbSrvs.map(s => [s.nome, s.id]));

    // Build and upsert remunerações
    const rems = entries
      .filter(([nome, d]) => nameMap.has(nome) && d.bruto > 0)
      .map(([nome, d]) => ({
        servidor_id: nameMap.get(nome)!,
        competencia,
        bruto: Math.round(d.bruto * 100) / 100,
        liquido: Math.round((d.bruto - d.descontos) * 100) / 100,
        fonte_url: "importação manual - planilha fev/2026",
      }));

    let remCriadas = 0;
    for (let i = 0; i < rems.length; i += BATCH) {
      const batch = rems.slice(i, i + BATCH);
      const { data, error } = await sb.from("remuneracao_servidores")
        .upsert(batch, { onConflict: "servidor_id,competencia" }).select("id");
      if (error) console.error(`Rem batch ${i}: ${error.message}`);
      remCriadas += (data || []).length;
    }

    const result = {
      competencia,
      linhas_xlsx: rows.length,
      registros_com_proventos: registros.length,
      servidores_unicos: agg.size,
      servidores_atualizados: servidoresAtualizados,
      remuneracoes_atualizadas: remCriadas,
      orgao_tipo,
    };

    // Log
    await sb.from("sync_log").insert({
      tipo: "import_folha_xlsx", status: "success",
      detalhes: result, finished_at: new Date().toISOString(),
    });

    // Send push notification for new payroll
    if (remCriadas > 0) {
      const [anoStr, mesStr] = competencia.split("-");
      const meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      const mesNome = meses[parseInt(mesStr)] || competencia;
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            title: `💰 Folha de ${mesNome}/${anoStr} disponível`,
            body: `A folha de pagamento de ${mesNome} já está disponível com ${remCriadas} registros.`,
            topic: "geral",
            url: "/prefeitura",
            dedup_key: `folha_${competencia}`,
          }),
        });
      } catch (e) {
        console.error("Push notification error:", e.message);
      }
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

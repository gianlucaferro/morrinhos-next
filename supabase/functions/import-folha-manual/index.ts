import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FolhaRow {
  nome: string;
  cargo: string;
  total_proventos: number;
  total_descontos: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { competencia, orgao_tipo, registros } = await req.json() as {
      competencia: string; // "2026-02"
      orgao_tipo: string; // "prefeitura" or "camara"
      registros: FolhaRow[];
    };

    if (!competencia || !registros?.length) {
      return new Response(JSON.stringify({ error: "competencia e registros são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Aggregate: sum proventos/descontos per person, keep cargo from MENSAL-type entry
    const agg = new Map<string, { cargo: string; bruto: number; descontos: number }>();
    for (const r of registros) {
      const existing = agg.get(r.nome);
      if (!existing) {
        agg.set(r.nome, { cargo: r.cargo, bruto: r.total_proventos, descontos: r.total_descontos });
      } else {
        existing.bruto += r.total_proventos;
        existing.descontos += r.total_descontos;
        // Prefer non-empty cargo
        if (!existing.cargo && r.cargo) existing.cargo = r.cargo;
      }
    }

    console.log(`Registros: ${registros.length}, Únicos: ${agg.size}`);

    // Upsert servidores
    const BATCH = 200;
    const entries = [...agg.entries()];
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH).map(([nome, d]) => ({
        nome, cargo: d.cargo || null, orgao_tipo: orgao_tipo || "prefeitura",
        fonte_url: "importação manual - planilha",
      }));
      const { error } = await sb.from("servidores").upsert(batch, { onConflict: "nome" });
      if (error) console.error(`Srv batch ${i}: ${error.message}`);
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
        fonte_url: "importação manual - planilha",
      }));

    let remCriadas = 0;
    for (let i = 0; i < rems.length; i += BATCH) {
      const batch = rems.slice(i, i + BATCH);
      const { data, error } = await sb.from("remuneracao_servidores")
        .upsert(batch, { onConflict: "servidor_id,competencia" }).select("id");
      if (error) console.error(`Rem batch ${i}: ${error.message}`);
      remCriadas += (data || []).length;
    }

    const result = { competencia, servidores: agg.size, remuneracoes: remCriadas, orgao_tipo };

    // Log
    await sb.from("sync_log").insert({
      tipo: "import_folha_manual", status: "success",
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

// supabase/functions/sync-frota-veiculos/index.ts
// CRON: toda segunda-feira às 06:00 BRT (09:00 UTC)
// schedule: "0 9 * * 1"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://morrinhos.centi.com.br";
const UA = "morrinhos.ai/1.0 (transparencia municipal)";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Orgãos do portal + situacao=3 (Todos) para pegar tudo de uma vez
const ORGAOS: Record<string, string> = {
  "22": "PODER EXECUTIVO MORRINHOS",
  "23": "FUNDEB",
  "55": "FMS",
  "67": "FMAS",
  "66": "FMCA",
  "44": "FUNPREPI",
  "71": "FME",
  "68": "FMC",
  "70": "FMLET",
  "72": "FUNDO MUNICIPAL DO IDOSO",
  "56": "FUNDO MEIO AMBIENTE",
};

// Map situação text from portal to our internal labels
const SIT_MAP: Record<string, string> = {
  "Ativo": "ativo",
  "Em manutenção": "manutencao",
  "Sucata": "sucata",
};

function inferirCategoria(descricao: string): string {
  const d = descricao.toUpperCase();
  if (/MOTOCICLETA|MOTO\b/.test(d)) return "Motocicleta";
  if (/RETROESCAVADEIRA/.test(d)) return "Retroescavadeira";
  if (/ESCAVADEIRA/.test(d)) return "Escavadeira";
  if (/PÁ[\s-]?CARREGADEIRA|PA[\s-]?CARREGADEIRA/.test(d)) return "Pá Carregadeira";
  if (/PATROL|MOTONIVELADORA/.test(d)) return "Motoniveladora";
  if (/ROLO[\s-]?COMPACTADOR/.test(d)) return "Rolo Compactador";
  if (/TRATOR AGRIC|TRATOR AGRÍC/.test(d)) return "Trator Agrícola";
  if (/TRATOR/.test(d)) return "Trator";
  if (/AMBULÂNCIA|AMBULANCIA/.test(d)) return "Ambulância";
  if (/MICRO[\s-]?ÔNIBUS|MICRO[\s-]?ONIBUS/.test(d)) return "Micro-ônibus";
  if (/ÔNIBUS|ONIBUS/.test(d)) return "Ônibus";
  if (/CAMINHÃO|CAMINHAO|CARGO/.test(d)) return "Caminhão";
  if (/VAN\b|FURGÃO|FURGAO|SPRINTER|DUCATO|MASTER/.test(d)) return "Van/Furgão";
  if (/PICKUP|PICK[\s-]?UP|CAMIONETE|CAMIONETA/.test(d)) return "Camionete/Pickup";
  if (/KOMBI/.test(d)) return "Kombi";
  if (/MÁQUINA|MAQUINA/.test(d)) return "Máquina Agrícola";
  return "Automóvel";
}

interface VeiculoRow {
  placa: string;
  descricao: string;
  marca: string;
  ano_fabricacao: string | null;
  ano_modelo: string | null;
  combustivel: string;
  situacao: string;
  orgao: string;
  categoria: string;
  fonte_url: string;
  atualizado_em: string;
}

function parseVeiculosHTML(html: string, orgaoNome: string): VeiculoRow[] {
  const veiculos: VeiculoRow[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const cells: string[] = [];
    let cellMatch;
    cellRegex.lastIndex = 0;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(
        cellMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
      );
    }

    // Columns: 0=Placa, 1=Descrição, 2=Marca, 3=Ano/Modelo, 4=Combustível, 5=Situação
    // Accept any 7-char alphanumeric plate (standard, Mercosul, or placeholder like 0000000)
    const placaRe = /^[A-Z0-9]{7}$/;
    if (cells.length >= 6 && placaRe.test(cells[0])) {
      const anoStr = cells[3] || "";
      const partes = anoStr.split("/");
      const anoFab = partes[0]?.trim() || null;
      const anoMod = partes[1]?.trim() || anoFab;

      const sitTexto = cells[5]?.trim() || "Ativo";
      const situacao = SIT_MAP[sitTexto] || sitTexto.toLowerCase();

      veiculos.push({
        placa: cells[0],
        descricao: cells[1] || "",
        marca: cells[2] || "",
        ano_fabricacao: anoFab,
        ano_modelo: anoMod,
        combustivel: cells[4] || "",
        situacao,
        orgao: orgaoNome,
        categoria: inferirCategoria(cells[1] || ""),
        fonte_url: `${BASE_URL}/transparencia/veiculos`,
        atualizado_em: new Date().toISOString(),
      });
    }
  }
  return veiculos;
}

async function fetchOrgao(orgaoId: string, orgaoNome: string): Promise<VeiculoRow[]> {
  // situacao=3 = Todos; wide date range to catch everything
  const params = new URLSearchParams({
    pagina: "1",
    itensporpagina: "1000",
    orderby: "",
    datainicio: "01/01/2000",
    datafim: "31/12/2030",
    idorgao: orgaoId,
    situacao: "3",
  });

  // Try GET first (the portal's table pagination uses GET with query params)
  const url = `${BASE_URL}/transparencia/veiculos?${params.toString()}`;
  try {
    let res = await fetch(url, {
      headers: { "User-Agent": UA, "X-Requested-With": "XMLHttpRequest" },
    });

    if (!res.ok) {
      // Fallback to POST
      res = await fetch(`${BASE_URL}/transparencia/veiculos`, {
        method: "POST",
        headers: {
          "User-Agent": UA,
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: params.toString(),
      });
    }

    if (!res.ok) {
      console.error(`HTTP ${res.status} for orgao ${orgaoNome}`);
      return [];
    }

    const html = await res.text();
    const found = parseVeiculosHTML(html, orgaoNome);

    // Debug: log first 200 chars of HTML if no vehicles found
    if (found.length === 0) {
      console.log(`DEBUG orgao ${orgaoId}: HTML length=${html.length}, snippet=${html.substring(0, 200).replace(/\n/g, " ")}`);
    }

    return found;
  } catch (e) {
    console.error(`Error fetching orgao ${orgaoNome}: ${(e as Error).message}`);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: log } = await supabase.from("sync_log")
    .insert({ tipo: "frota_veiculos", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;

  try {
    console.log("🚛 Sync frota veículos...");
    const placasVistas = new Set<string>();
    const todos: VeiculoRow[] = [];

    // Fetch orgãos in parallel batches of 3
    const orgaoEntries = Object.entries(ORGAOS);
    for (let i = 0; i < orgaoEntries.length; i += 3) {
      const batch = orgaoEntries.slice(i, i + 3);
      const results = await Promise.all(
        batch.map(([id, nome]) => fetchOrgao(id, nome))
      );
      for (const veiculos of results) {
        for (const v of veiculos) {
          if (!placasVistas.has(v.placa)) {
            placasVistas.add(v.placa);
            todos.push(v);
          }
        }
      }
      if (i + 3 < orgaoEntries.length) await delay(400);
    }

    console.log(`Total veículos únicos: ${todos.length}`);

    if (todos.length === 0) {
      const result = { total: 0, inseridos: 0, nota: "portal retornou 0 veículos" };
      if (logId) {
        await supabase.from("sync_log").update({
          status: "success", detalhes: result, finished_at: new Date().toISOString(),
        }).eq("id", logId);
      }
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert em lotes
    let inseridos = 0;
    const LOTE = 100;
    for (let i = 0; i < todos.length; i += LOTE) {
      const lote = todos.slice(i, i + LOTE);
      const { error } = await supabase.from("veiculos_frota").upsert(lote, { onConflict: "placa" });
      if (error) console.error(`Upsert lote ${i}: ${error.message}`);
      else inseridos += lote.length;
    }

    const result = { total: todos.length, inseridos };
    console.log(`✅ ${inseridos}/${todos.length} veículos persistidos.`);

    if (logId) {
      await supabase.from("sync_log").update({
        status: "success", detalhes: result, finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro fatal:", err);
    if (logId) {
      await supabase.from("sync_log").update({
        status: "error", detalhes: { error: String(err) }, finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

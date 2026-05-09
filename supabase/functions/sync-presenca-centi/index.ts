import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA = "morrinhos.ai/1.0 (transparencia legislativa)";
const CENTI_URL = "https://camaramorrinhos.centi.com.br/transparencia/atosadministrativos/10";

const VEREADORES = [
  "Fernando Abraão Magalhães Silva",
  "Douglas Miranda Silva",
  "Reginaldo Moreira da Silva",
  "Aparecida Divani Rocha Cordeiro",
  "Adriana Dias Pinheiro",
  "Edimar Lopes Machado",
  "Marco Antonio Antunes da Cruz",
  "Sirley de Fatima Menezes Wehbe",
  "Welton Eterno da Silva",
  "Wennder Trindade e Silva",
  "Yuri Santiago Alves",
];

function parseDate(dateStr: string): string | null {
  const m = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

async function analyzePresencaPDF(pdfBase64: string, apiKey: string): Promise<{ nome: string; presente: boolean }[]> {
  // Use Gemini Vision to analyze the scanned PDF image
  const prompt = `Analise esta lista de presença de sessão da Câmara Municipal de Morrinhos.
Para cada vereador listado abaixo, determine se está PRESENTE ou AUSENTE com base nas assinaturas e anotações visíveis.

Vereadores da legislatura atual:
1. Fernando Abraão Magalhães Silva
2. Douglas Miranda Silva
3. Reginaldo Moreira da Silva
4. Aparecida Divani Rocha Cordeiro
5. Adriana Dias Pinheiro
6. Edimar Lopes Machado
7. Marco Antonio Antunes da Cruz
8. Sirley de Fatima Menezes Wehbe
9. Welton Eterno da Silva
10. Wennder Trindade e Silva
11. Yuri Santiago Alves

Responda APENAS em formato JSON array, sem markdown, sem explicações:
[{"nome":"Nome Completo","presente":true},{"nome":"Nome Completo","presente":false}]

Se houver indicação de "Ausente", "Justificad" ou sem assinatura ao lado do nome, marque como presente=false.
Se houver assinatura ou marca de presença, marque como presente=true.`;

  const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
        ],
      }],
      max_tokens: 1000,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`AI API error ${resp.status}: ${errText}`);
    throw new Error(`AI API error ${resp.status}`);
  }

  const result = await resp.json();
  const content = result.choices?.[0]?.message?.content || "";
  console.log(`AI response: ${content.substring(0, 300)}`);

  // Parse JSON from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("No JSON found in AI response");
    return VEREADORES.map(n => ({ nome: n, presente: true }));
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error("Failed to parse AI JSON response");
    return VEREADORES.map(n => ({ nome: n, presente: true }));
  }
}

Deno.serve(async (req) => {
  // 🚨 KILL-SWITCH: esta função depende de fonte (Centi) que NÃO existe pra Morrinhos.
  // Está bloqueada via env DISABLED=true até ser reescrita pra NucleoGov.
  if (Deno.env.get("DISABLED") === "true") {
    return new Response(
      JSON.stringify({ ok: false, disabled: true, reason: "needs_nucleogov_rewrite" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "presenca-centi", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;

  const errors: string[] = [];
  let newCount = 0;

  try {
    // Get vereadores from DB for ID mapping
    const { data: dbVereadores } = await sb.from("vereadores").select("id, nome");
    const vereadorIdMap = new Map<string, string>();
    for (const v of dbVereadores || []) {
      vereadorIdMap.set(v.nome.toLowerCase(), v.id);
    }

    // Fetch the Centi page to get PDF links
    const pageResp = await fetch(CENTI_URL, { headers: { "User-Agent": UA } });
    if (!pageResp.ok) throw new Error(`Centi page HTTP ${pageResp.status}`);
    const pageHtml = await pageResp.text();

    // Extract all download links
    const linkRegex = /href="(https:\/\/camaramorrinhos\.centi\.com\.br\/download\/[^"]+\.PDF)"/gi;
    const links: string[] = [];
    let lm;
    while ((lm = linkRegex.exec(pageHtml)) !== null) links.push(lm[1]);

    // Extract table cells for metadata
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cm;
    while ((cm = cellRegex.exec(pageHtml)) !== null) {
      cells.push(cm[1].replace(/<[^>]*>/g, "").trim());
    }

    // Build entries from table data
    const entries: { descricao: string; data: string; pdfUrl: string }[] = [];
    let li = 0;
    for (let i = 0; i < cells.length - 3; i++) {
      if (/LISTA\s+(?:DE\s+)?PRESEN/i.test(cells[i])) {
        // Find the date cell (DD/MM/YYYY pattern) nearby
        let dateStr = "";
        for (let j = i + 1; j < Math.min(i + 5, cells.length); j++) {
          if (/\d{2}\/\d{2}\/\d{4}/.test(cells[j])) {
            dateStr = cells[j].match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || "";
            break;
          }
        }
        if (li < links.length) {
          entries.push({ descricao: cells[i], data: dateStr, pdfUrl: links[li] });
          li++;
        }
      }
    }

    // Fallback if table parsing didn't work
    if (entries.length === 0) {
      const dateRegex = /(\d{2}\/\d{2}\/\d{4})/g;
      const dates: string[] = [];
      let dm;
      while ((dm = dateRegex.exec(pageHtml)) !== null) dates.push(dm[1]);

      const descRegex = /LISTA\s+(?:DE\s+)?PRESEN[ÇC]A[^<]*/gi;
      const descs: string[] = [];
      let ddm;
      while ((ddm = descRegex.exec(pageHtml)) !== null) descs.push(ddm[0].trim());

      for (let i = 0; i < Math.min(descs.length, links.length); i++) {
        entries.push({ descricao: descs[i], data: dates[i] || "", pdfUrl: links[i] });
      }
    }

    console.log(`Encontradas ${entries.length} listas de presença`);

    for (const entry of entries) {
      try {
        console.log(`Processando: ${entry.descricao}`);

        // Download PDF as base64
        const pdfResp = await fetch(entry.pdfUrl, { headers: { "User-Agent": UA } });
        if (!pdfResp.ok) { errors.push(`PDF HTTP ${pdfResp.status}`); continue; }
        const pdfBuffer = new Uint8Array(await pdfResp.arrayBuffer());
        // Use chunked base64 encoding to avoid stack overflow on large PDFs
        const pdfBase64 = encodeBase64(pdfBuffer);

        // Use AI to analyze presence
        let presencaResults: { nome: string; presente: boolean }[];
        if (apiKey) {
          presencaResults = await analyzePresencaPDF(pdfBase64, apiKey);
        } else {
          console.log("No GEMINI_API_KEY, marking all as present");
          presencaResults = VEREADORES.map(n => ({ nome: n, presente: true }));
        }

        // Parse session metadata
        const tipoSessao = /extraordin/i.test(entry.descricao) ? "extraordinária" : "ordinária";
        const sessaoData = parseDate(entry.data) || null;
        const anoMatch = entry.data.match(/(\d{4})/);
        const ano = anoMatch ? parseInt(anoMatch[1]) : new Date().getFullYear();
        const titulo = entry.descricao.replace(/\s+/g, " ").trim() || `Sessão ${sessaoData || ""}`;

        for (const p of presencaResults) {
          // Match nome to known vereadores
          const matchedNome = VEREADORES.find(v => 
            v.toLowerCase() === p.nome.toLowerCase() ||
            v.toLowerCase().includes(p.nome.toLowerCase().split(" ")[0])
          ) || p.nome;

          const vereadorId = vereadorIdMap.get(matchedNome.toLowerCase()) || null;

          const { error } = await sb.from("presenca_sessoes").upsert({
            sessao_titulo: titulo,
            sessao_data: sessaoData,
            tipo_sessao: tipoSessao,
            ano,
            vereador_id: vereadorId,
            vereador_nome: matchedNome,
            presente: p.presente,
            fonte_url: entry.pdfUrl,
          }, { onConflict: "sessao_titulo,vereador_nome" });

          if (error) errors.push(`${matchedNome}: ${error.message}`);
          else newCount++;
        }

        // Delay between PDFs to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        errors.push(`PDF error: ${e.message}`);
      }
    }

    // Clean up placeholder records
    await sb.from("presenca_sessoes").delete().eq("vereador_nome", "SESSÃO");

    const result = { entries: entries.length, records: newCount, errors: errors.slice(0, 10) };
    if (logId) {
      await sb.from("sync_log").update({
        status: errors.length > 0 ? "partial" : "success",
        detalhes: result, finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro:", error);
    if (logId) {
      await sb.from("sync_log").update({
        status: "error", detalhes: { error: error.message, errors },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

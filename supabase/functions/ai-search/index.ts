import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch context data from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parallel data fetches for context
    const [
      { data: indicadores },
      { data: agro },
      { data: vereadores },
      { data: executivo },
      { data: educIndicadores },
      { data: saudeIndicadores },
      { data: beneficios },
      { data: arrecadacao },
      { data: secretarias },
      { data: servidores },
      { data: remuneracaoVereadores },
    ] = await Promise.all([
      supabase.from("indicadores_municipais").select("chave, valor, valor_texto, ano_referencia").limit(50),
      supabase.from("agro_indicadores").select("categoria, chave, valor_texto, ano_referencia").not("categoria", "like", "historico%").not("categoria", "like", "comparativo%").limit(50),
      supabase.from("vereadores").select("nome, partido, telefone, email").limit(20),
      supabase.from("executivo").select("nome, tipo, partido, mandato_inicio, mandato_fim").limit(5),
      supabase.from("educacao_indicadores").select("categoria, chave, valor_texto, ano_referencia").limit(30),
      supabase.from("saude_indicadores").select("categoria, indicador, valor_texto, ano").order("ano", { ascending: false }).limit(30),
      supabase.from("beneficios_sociais").select("programa, beneficiarios, valor_pago, competencia").order("competencia", { ascending: false }).limit(20),
      supabase.from("arrecadacao_municipal").select("categoria, tipo, valor, competencia, ano").order("ano", { ascending: false }).limit(30),
      supabase.from("secretarias").select("nome, secretario_nome, subsidio, email, telefone").limit(30),
      supabase.from("servidores").select("nome, cargo, lotacao").limit(50),
      supabase.from("remuneracao_mensal").select("vereador_id, bruto, liquido, competencia, subsidio_referencia").order("competencia", { ascending: false }).limit(20),
    ]);

    // Specific query-based data (hybrid approach)
    let extraContext = "";
    const qLower = question.toLowerCase();

    if (qLower.includes("projeto") || qLower.includes("lei")) {
      const { data: projetos } = await supabase.from("projetos").select("numero, tipo, ementa, autor_texto, status, data").order("data", { ascending: false }).limit(15);
      if (projetos?.length) {
        extraContext += "\n\nÚltimos projetos de lei:\n" + projetos.map(p => `- ${p.tipo} nº ${p.numero} (${p.status}): ${p.ementa.slice(0, 100)}... — Autor: ${p.autor_texto}`).join("\n");
      }
    }

    if (qLower.includes("decreto")) {
      const { data: decretos } = await supabase.from("decretos").select("numero, ementa, data_publicacao").order("data_publicacao", { ascending: false }).limit(10);
      if (decretos?.length) {
        extraContext += "\n\nÚltimos decretos:\n" + decretos.map(d => `- Decreto nº ${d.numero}: ${d.ementa.slice(0, 100)}...`).join("\n");
      }
    }

    if (qLower.includes("obra")) {
      const { data: obras } = await supabase.from("obras").select("nome, status, valor, empresa, local").limit(10);
      if (obras?.length) {
        extraContext += "\n\nObras:\n" + obras.map(o => `- ${o.nome} (${o.status}) — R$ ${o.valor?.toLocaleString("pt-BR")} — ${o.empresa || "N/D"}`).join("\n");
      }
    }

    if (qLower.includes("contrato")) {
      const { data: contratos } = await supabase.from("contratos").select("numero, objeto, empresa, valor, status").order("vigencia_inicio", { ascending: false }).limit(10);
      if (contratos?.length) {
        extraContext += "\n\nContratos recentes:\n" + contratos.map(c => `- Contrato ${c.numero}: ${c.objeto?.slice(0, 80)}... — ${c.empresa} — R$ ${c.valor?.toLocaleString("pt-BR")}`).join("\n");
      }
    }

    if (qLower.includes("emenda")) {
      const { data: emendas } = await supabase.from("emendas_parlamentares").select("parlamentar_nome, objeto, valor_empenhado, valor_pago, ano").order("ano", { ascending: false }).limit(15);
      if (emendas?.length) {
        extraContext += "\n\nEmendas parlamentares:\n" + emendas.map(e => `- ${e.parlamentar_nome} (${e.ano}): ${e.objeto?.slice(0, 80)}... — Empenhado: R$ ${e.valor_empenhado?.toLocaleString("pt-BR")}, Pago: R$ ${e.valor_pago?.toLocaleString("pt-BR")}`).join("\n");
      }
    }

    if (qLower.includes("seguran") || qLower.includes("crime") || qLower.includes("homic") || qLower.includes("roubo") || qLower.includes("furto") || qLower.includes("violên")) {
      const { data: seguranca } = await supabase.from("seguranca_indicadores").select("ano, indicador, ocorrencias, vitimas, municipio").eq("municipio", "Morrinhos").order("ano", { ascending: false }).limit(40);
      if (seguranca?.length) {
        extraContext += "\n\nSegurança pública (SINESP/MJ):\n" + seguranca.map(s => `- ${s.indicador} (${s.ano}): ${s.ocorrencias ?? "?"} ocorrências, ${s.vitimas ?? "?"} vítimas`).join("\n");
      }
    }

    // Fetch salary data for secretários when relevant
    if (qLower.includes("salário") || qLower.includes("salario") || qLower.includes("remuneração") || qLower.includes("remuneracao") || qLower.includes("ganha") || qLower.includes("recebe") || qLower.includes("subsídio") || qLower.includes("subsidio") || qLower.includes("secretári") || qLower.includes("secretari") || qLower.includes("servidor") || qLower.includes("folha")) {
      // Fetch servidores with remuneracao for secretários
      const { data: remServidores } = await supabase.from("remuneracao_servidores").select("servidor_id, bruto, liquido, competencia").order("competencia", { ascending: false }).limit(100);
      if (remServidores?.length) {
        // Cross-reference with servidores names
        const serverIds = [...new Set(remServidores.map(r => r.servidor_id))];
        const { data: servidoresDetalhes } = await supabase.from("servidores").select("id, nome, cargo, lotacao").in("id", serverIds.slice(0, 50));
        if (servidoresDetalhes?.length) {
          const remMap = new Map<string, typeof remServidores[0]>();
          for (const r of remServidores) {
            if (!remMap.has(r.servidor_id)) remMap.set(r.servidor_id, r);
          }
          extraContext += "\n\nRemuneração de servidores (folha mais recente):\n" + servidoresDetalhes.map(s => {
            const rem = remMap.get(s.id);
            return `- ${s.nome} (${s.cargo || "s/cargo"}, ${s.lotacao || "s/lotação"}): Bruto R$ ${rem?.bruto?.toLocaleString("pt-BR") || "?"}, Líquido R$ ${rem?.liquido?.toLocaleString("pt-BR") || "?"}`;
          }).join("\n");
        }
      }
    }

    // Fetch presença data when relevant
    if (qLower.includes("presença") || qLower.includes("presenca") || qLower.includes("falta") || qLower.includes("sessão") || qLower.includes("sessao") || qLower.includes("frequência") || qLower.includes("frequencia")) {
      const { data: presenca } = await supabase.from("presenca_sessoes").select("vereador_nome, presente, sessao_data, sessao_titulo, ano").order("sessao_data", { ascending: false }).limit(50);
      if (presenca?.length) {
        // Aggregate by vereador
        const presencaMap = new Map<string, { total: number; presentes: number }>();
        for (const p of presenca) {
          const nome = p.vereador_nome || "Desconhecido";
          if (!presencaMap.has(nome)) presencaMap.set(nome, { total: 0, presentes: 0 });
          const entry = presencaMap.get(nome)!;
          entry.total++;
          if (p.presente) entry.presentes++;
        }
        extraContext += "\n\nPresença em sessões (registros recentes):\n" + [...presencaMap.entries()].map(([nome, { total, presentes }]) => `- ${nome}: ${presentes}/${total} presenças (${Math.round(presentes / total * 100)}%)`).join("\n");
      }
    }

    // Fetch licitações when relevant
    if (qLower.includes("licitaç") || qLower.includes("licitac")) {
      const { data: licitacoes } = await supabase.from("licitacoes").select("numero, objeto, modalidade, status, data_publicacao").order("data_publicacao", { ascending: false }).limit(10);
      if (licitacoes?.length) {
        extraContext += "\n\nLicitações recentes:\n" + licitacoes.map(l => `- ${l.modalidade || "N/D"} nº ${l.numero}: ${l.objeto?.slice(0, 80)}... (${l.status})`).join("\n");
      }
    }

    // Build system prompt with data context
    const totalVereadores = vereadores?.length || 0;

    const systemPrompt = `Você é o assistente inteligente do Morrinhos.ai, um portal de transparência pública do município de Morrinhos, Goiás, Brasil.

Responda perguntas sobre o município usando APENAS os dados fornecidos abaixo. Se não tiver a informação, diga claramente que não possui esse dado.

Seja conciso, objetivo e use linguagem simples. Cite fontes quando possível (IBGE, Portal da Transparência, etc).
Use formatação markdown para organizar a resposta (negrito, listas, etc).

IMPORTANTE: 
- A Câmara Municipal de Morrinhos possui ${totalVereadores} vereadores atualmente.
- Quando perguntarem sobre salários/remunerações de secretários, use os dados de Secretarias e Remuneração de servidores fornecidos abaixo.
- Quando perguntarem "quantos vereadores", responda ${totalVereadores} e liste-os.

## Dados disponíveis:

### Indicadores gerais do município:
${indicadores?.map(i => `- ${i.chave}: ${i.valor_texto || i.valor} (${i.ano_referencia})`).join("\n") || "Sem dados"}

### Poder Executivo:
${executivo?.map(e => `- ${e.tipo}: ${e.nome} (${e.partido || "s/p"}) — Mandato: ${e.mandato_inicio} a ${e.mandato_fim}`).join("\n") || "Sem dados"}

### Vereadores (Legislativo) — Total: ${totalVereadores}:
${vereadores?.map(v => `- ${v.nome} (${v.partido || "s/p"})${v.telefone ? ` — Tel: ${v.telefone}` : ""}${v.email ? ` — Email: ${v.email}` : ""}`).join("\n") || "Sem dados"}

### Remuneração dos vereadores (últimos registros):
${remuneracaoVereadores?.length ? remuneracaoVereadores.map(r => `- Vereador ID ${r.vereador_id}: Bruto R$ ${r.bruto?.toLocaleString("pt-BR") || "?"}, Líquido R$ ${r.liquido?.toLocaleString("pt-BR") || "?"}, Subsídio ref: R$ ${r.subsidio_referencia?.toLocaleString("pt-BR")} (${r.competencia})`).join("\n") : "Sem dados"}

### Secretarias municipais e seus secretários:
${secretarias?.map(s => `- ${s.nome}: Secretário(a) ${s.secretario_nome || "N/D"}${s.subsidio ? ` — Subsídio: R$ ${s.subsidio.toLocaleString("pt-BR")}` : ""}${s.telefone ? ` — Tel: ${s.telefone}` : ""}${s.email ? ` — Email: ${s.email}` : ""}`).join("\n") || "Sem dados"}

### Agropecuária (IBGE):
${agro?.map(a => `- [${a.categoria}] ${a.chave}: ${a.valor_texto} (${a.ano_referencia})`).join("\n") || "Sem dados"}

### Educação:
${educIndicadores?.map(e => `- [${e.categoria}] ${e.chave}: ${e.valor_texto} (${e.ano_referencia})`).join("\n") || "Sem dados"}

### Saúde:
${saudeIndicadores?.map(s => `- [${s.categoria}] ${s.indicador}: ${s.valor_texto} (${s.ano})`).join("\n") || "Sem dados"}

### Benefícios Sociais (últimos registros):
${beneficios?.map(b => `- ${b.programa}: ${b.beneficiarios} beneficiários, R$ ${b.valor_pago?.toLocaleString("pt-BR")} (${b.competencia})`).join("\n") || "Sem dados"}

### Arrecadação:
${arrecadacao?.map(a => `- [${a.tipo}] ${a.categoria}: R$ ${a.valor?.toLocaleString("pt-BR")} (${a.competencia})`).join("\n") || "Sem dados"}
${extraContext}`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Gemini API error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

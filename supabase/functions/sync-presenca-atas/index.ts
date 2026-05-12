import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lista fixa de vereadores da legislatura 2025-2028
const VEREADORES_LEGISLATURA = [
  "Fernando Abraão Magalhães Silva",
  "Douglas Miranda Silva",
  "Reginaldo Moreira da Silva",
  "Aparecida Divani Rocha Cordeiro",
  "Adriana Dias Pinheiro",
  "Edimar Lopes Machado",
  "Marco Antonio Antunes da Cruz",
  "Sirley de Fátima Menezes Wehbe",
  "Welton Eterno da Silva",
  "Wennder Trindade e Silva",
  "Yuri Santiago Alves",
];

function normalizeNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Matches vereador names from text using normalized comparison.
 * Returns array of matched full names.
 */
function matchVereadoresInText(text: string): string[] {
  const normalizedText = normalizeNome(text);
  const matched: string[] = [];

  for (const nome of VEREADORES_LEGISLATURA) {
    const normalizedNome = normalizeNome(nome);
    
    // Exact match
    if (normalizedText.includes(normalizedNome)) {
      matched.push(nome);
      continue;
    }

    // Match by first + last name
    const parts = normalizedNome.split(" ");
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    if (firstName.length > 3 && lastName.length > 3 &&
        normalizedText.includes(firstName) && normalizedText.includes(lastName)) {
      matched.push(nome);
    }
  }

  return matched;
}

/**
 * Use AI to extract attendance from ata text
 */
async function extractAttendanceWithAI(ataText: string): Promise<string[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const systemPrompt = `Você é um assistente que extrai a lista de vereadores presentes de atas de sessões legislativas.

Lista oficial de vereadores da legislatura 2025-2028:
${VEREADORES_LEGISLATURA.map((n, i) => `${i + 1}. ${n}`).join("\n")}

Regras:
- Procure trechos como "vereadores presentes", "compareceram à sessão", "presentes na sessão", "verificada a presença"
- Retorne APENAS os nomes dos vereadores PRESENTES, um por linha
- Use exatamente os nomes da lista oficial acima
- Se não encontrar informação de presença, retorne "NENHUM_ENCONTRADO"
- NÃO invente dados. Se o texto não mencionar presença, retorne "NENHUM_ENCONTRADO"`;

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extraia os vereadores presentes desta ata:\n\n${ataText.slice(0, 8000)}` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "report_attendance",
            description: "Report the list of vereadores present at the session",
            parameters: {
              type: "object",
              properties: {
                presentes: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of vereador full names who were present",
                },
                trecho_fonte: {
                  type: "string",
                  description: "The text excerpt that mentions attendance",
                },
              },
              required: ["presentes"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "report_attendance" } },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI error:", response.status, errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    // Fallback: try text matching
    return matchVereadoresInText(ataText);
  }

  try {
    const args = JSON.parse(toolCall.function.arguments);
    const presentes = args.presentes || [];
    
    // Validate against official list
    return presentes.filter((nome: string) =>
      VEREADORES_LEGISLATURA.some(
        (v) => normalizeNome(v) === normalizeNome(nome)
      )
    );
  } catch {
    return matchVereadoresInText(ataText);
  }
}

// === Auth guard: validates CRON_SECRET or service_role bearer ===
function authorize(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerCron = req.headers.get("x-cron-secret");
  if (cronSecret && headerCron === cronSecret) return true;
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!authorize(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const {
      action = "process_ata",
      sessao_titulo,
      sessao_data,
      ano,
      tipo_sessao = "ordinária",
      ata_texto,
      presentes_manual,
      fonte_url,
      ata_url,
      fonte_tipo = "ata",
    } = body;

    // Get vereador IDs from DB
    const { data: vereadoresDb } = await sb.from("vereadores").select("id, nome");
    const vereadorIdMap = new Map<string, string>();
    for (const v of vereadoresDb || []) {
      vereadorIdMap.set(normalizeNome(v.nome), v.id);
    }

    if (action === "process_ata") {
      // Extract attendance from ata text using AI
      if (!ata_texto && !presentes_manual) {
        return new Response(JSON.stringify({ error: "ata_texto ou presentes_manual é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!sessao_titulo) {
        return new Response(JSON.stringify({ error: "sessao_titulo é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let presentes: string[];
      
      if (presentes_manual && Array.isArray(presentes_manual)) {
        // Direct input of verified attendance
        presentes = presentes_manual.filter((n: string) =>
          VEREADORES_LEGISLATURA.some(v => normalizeNome(v) === normalizeNome(n))
        );
      } else {
        // AI extraction from ata text
        presentes = await extractAttendanceWithAI(ata_texto);
      }

      const ausentes = VEREADORES_LEGISLATURA.filter(
        (v) => !presentes.some((p) => normalizeNome(p) === normalizeNome(v))
      );

      const sessionAno = ano || (sessao_data ? parseInt(sessao_data.split("-")[0]) : new Date().getFullYear());

      // Upsert presence records for ALL vereadores
      let insertedCount = 0;
      const errors: string[] = [];

      for (const nome of VEREADORES_LEGISLATURA) {
        const isPresente = presentes.some((p) => normalizeNome(p) === normalizeNome(nome));
        const vereadorId = vereadorIdMap.get(normalizeNome(nome)) || null;

        const { error } = await sb.from("presenca_sessoes").upsert({
          sessao_titulo,
          sessao_data: sessao_data || null,
          ano: sessionAno,
          tipo_sessao,
          vereador_nome: nome,
          vereador_id: vereadorId,
          presente: isPresente,
          fonte_url: fonte_url || null,
          ata_url: ata_url || null,
          fonte_tipo,
          status_verificacao: presentes_manual ? "confirmado" : "confirmado",
        }, { onConflict: "sessao_titulo,vereador_nome", ignoreDuplicates: false });

        if (error) errors.push(`${nome}: ${error.message}`);
        else insertedCount++;
      }

      return new Response(JSON.stringify({
        success: true,
        sessao: sessao_titulo,
        presentes: presentes.length,
        ausentes: ausentes.length,
        presentes_nomes: presentes,
        ausentes_nomes: ausentes,
        records_inserted: insertedCount,
        errors: errors.slice(0, 5),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "batch_process") {
      // Process multiple sessions at once
      const { sessoes } = body;
      if (!Array.isArray(sessoes)) {
        return new Response(JSON.stringify({ error: "sessoes array é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: any[] = [];
      for (const sessao of sessoes) {
        const presentes = sessao.presentes || [];
        const ausentes = VEREADORES_LEGISLATURA.filter(
          (v) => !presentes.some((p: string) => normalizeNome(p) === normalizeNome(v))
        );
        const sessionAno = sessao.ano || (sessao.sessao_data ? parseInt(sessao.sessao_data.split("-")[0]) : new Date().getFullYear());

        let count = 0;
        for (const nome of VEREADORES_LEGISLATURA) {
          const isPresente = presentes.some((p: string) => normalizeNome(p) === normalizeNome(nome));
          const vereadorId = vereadorIdMap.get(normalizeNome(nome)) || null;

          const { error } = await sb.from("presenca_sessoes").upsert({
            sessao_titulo: sessao.sessao_titulo,
            sessao_data: sessao.sessao_data || null,
            ano: sessionAno,
            tipo_sessao: sessao.tipo_sessao || "ordinária",
            vereador_nome: nome,
            vereador_id: vereadorId,
            presente: isPresente,
            fonte_url: sessao.fonte_url || null,
            ata_url: sessao.ata_url || null,
            fonte_tipo: sessao.fonte_tipo || "ata",
            status_verificacao: "confirmado",
          }, { onConflict: "sessao_titulo,vereador_nome", ignoreDuplicates: false });

          if (!error) count++;
        }

        results.push({
          sessao: sessao.sessao_titulo,
          presentes: presentes.length,
          ausentes: ausentes.length,
          records: count,
        });
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

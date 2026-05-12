import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = [
  "Alimentação",
  "Supermercados",
  "Saúde",
  "Beleza e Estética",
  "Farmácia e Drogaria",
  "Advogados",
  "Educação",
  "Esportes",
  "Automotivo",
  "Agro",
  "Moda e Vestuário",
  "Serviços Especializados",
  "Materiais de Construção",
  "Móveis e Decoração",
  "Pet Shop",
  "Veterinários",
  "Personal Trainer",
  "Imobiliário",
  "Hospedagem e Turismo",
  "Papelaria e Presentes",
  "Artesanato",
  "Serviços Gerais",
  "Tecnologia",
  "Outros",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length < 3) {
      return new Response(JSON.stringify({ category: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ category: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-flash-lite-latest",
          messages: [
            {
              role: "system",
              content: `Você é um classificador de negócios de uma cidade pequena brasileira. Dado o nome de um estabelecimento comercial, retorne APENAS o nome exato de uma das categorias abaixo que melhor se encaixa. Se não tiver certeza, retorne "null" (sem aspas).

Categorias válidas:
${CATEGORIES.join("\n")}

Regras:
- Restaurantes, bares, lanchonetes, pit dogs, sorveterias, confeitarias, padarias, açaíteiras → Alimentação
- Supermercados, mercados, mercearias, atacadões, comerciais de alimentos → Supermercados
- Cabeleireiros, manicures, estética, harmonização, depilação → Beleza e Estética
- Clínicas médicas, hospitais, fisioterapeutas, fonoaudiólogos, dentistas, nutricionistas, laboratórios → Saúde
- Drogarias, farmácias → Farmácia e Drogaria
- Advocacia, escritório de advocacia → Advogados
- Escolas, colégios, cursos → Educação
- Academias → Esportes
- Oficinas, auto peças, lava jatos, estética automotiva, mecânica, concessionária → Automotivo
- Máquinas agrícolas, tratores, implementos agrícolas, agrônomos, fazendas, agropecuárias, sementes, rações agro, cooperativas rurais, avicultura, casqueamento bovino → Agro
- Lojas de roupa, calçados, boutiques, moda, confecções, joalherias, semijoias, acessórios → Moda e Vestuário
- Contabilidade, engenharia, arquitetura, gráfica, consultoria, vistos, climatização, segurança eletrônica, fotógrafos, eventos → Serviços Especializados
- Lojas de material de construção, ferragistas, vidraçarias, pisos → Materiais de Construção
- Marcenarias, lojas de móveis, decoração, cortinas, persianas → Móveis e Decoração
- Petshop, rações para pets, banho e tosa → Pet Shop
- Clínicas veterinárias → Veterinários
- Personal trainer → Personal Trainer
- Imobiliárias, corretores → Imobiliário
- Hotéis, pousadas, guias turísticos → Hospedagem e Turismo
- Papelarias, presentes, cestas, buquês → Papelaria e Presentes
- Ateliês, crochê, bordado, artesanato, cutelaria artesanal → Artesanato
- Pintores, entregas, terraplanagem, escavações, taxistas, eletricistas → Serviços Gerais
- Eletrônica, informática, celulares, operadoras → Tecnologia
- Responda APENAS o nome da categoria ou null. Nada mais.`,
            },
            {
              role: "user",
              content: name.trim(),
            },
          ],
          max_tokens: 30,
        }),
      }
    );

    if (!response.ok) {
      return new Response(JSON.stringify({ category: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";
    
    const category = CATEGORIES.find(
      (c) => c.toLowerCase() === raw.toLowerCase()
    );

    return new Response(JSON.stringify({ category: category || null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-category error:", e);
    return new Response(JSON.stringify({ category: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

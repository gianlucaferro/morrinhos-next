const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { placa } = await req.json();

    if (!placa || typeof placa !== "string") {
      return new Response(
        JSON.stringify({ error: "Placa é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const placaNorm = placa.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const placaRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
    if (!placaRegex.test(placaNorm)) {
      return new Response(
        JSON.stringify({ error: "Formato de placa inválido. Use ABC1234 ou ABC1D23." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let vehicleData: Record<string, string | number | null> = {};
    let found = false;

    // 1) Try apiplacas.com.br (paid, with key)
    const apiKey = Deno.env.get("PLACA_API_KEY");
    if (apiKey) {
      try {
        const res = await fetch(`https://api.apiplacas.com.br/consulta/${placaNorm}`, {
          headers: { "Authorization": `Bearer ${apiKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          vehicleData = {
            marca: data.marca || data.brand || null,
            modelo: data.modelo || data.model || null,
            ano: data.ano || data.year || null,
            ano_modelo: data.ano_modelo || data.model_year || null,
            cor: data.cor || data.color || null,
            combustivel: data.combustivel || data.fuel || null,
            tipo_veiculo: data.tipo || data.vehicle_type || null,
            potencia: data.potencia || data.power || null,
            cilindradas: data.cilindradas || data.displacement || null,
          };
          found = true;
        } else {
          const status = res.status;
          console.warn(`apiplacas returned ${status}`);
        }
      } catch (e) {
        console.warn("apiplacas fetch failed:", (e as Error).message);
      }
    }

    // 2) Fallback: Placa.com API (free, public)
    if (!found) {
      try {
        const res = await fetch(`https://wdapi2.com.br/consulta/${placaNorm}/${apiKey || ""}`, {
          headers: { "Accept": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && !data.error && data.MARCA) {
            vehicleData = {
              marca: data.MARCA || null,
              modelo: data.MODELO || null,
              ano: data.ano || null,
              ano_modelo: data.anoModelo || null,
              cor: data.cor || null,
              combustivel: data.combustivel || null,
              tipo_veiculo: data.segmento || null,
            };
            found = true;
          }
        }
      } catch (e) {
        console.warn("wdapi2 failed:", (e as Error).message);
      }
    }

    if (!found) {
      return new Response(
        JSON.stringify({ error: "Veículo não encontrado. Preencha manualmente." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out null values (NEVER include placa in response)
    const filtered: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(vehicleData)) {
      if (v !== null && v !== undefined && v !== "") {
        filtered[k] = v;
      }
    }

    return new Response(
      JSON.stringify({ veiculo: filtered }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("consulta-placa error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

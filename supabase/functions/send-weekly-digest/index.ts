import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "Morrinhos.AI <contato@morrinhos.ai>";
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const periodStart = oneWeekAgo.toISOString();
    const periodEnd = now.toISOString();

    // Fetch new data from the past week in parallel
    const [projetosRes, atuacaoRes, decretosRes, portariasRes, leisRes] = await Promise.all([
      supabase
        .from("projetos")
        .select("numero, tipo, ementa, autor_texto, data, resumo_simples")
        .gte("created_at", periodStart)
        .order("data", { ascending: false })
        .limit(20),
      supabase
        .from("atuacao_parlamentar")
        .select("tipo, numero, descricao, autor_texto, data, resumo")
        .gte("created_at", periodStart)
        .order("data", { ascending: false })
        .limit(20),
      supabase
        .from("decretos")
        .select("numero, ementa, data_publicacao, resumo_ia")
        .gte("created_at", periodStart)
        .order("data_publicacao", { ascending: false })
        .limit(10),
      supabase
        .from("portarias")
        .select("numero, ementa, data_publicacao, resumo_ia")
        .gte("created_at", periodStart)
        .order("data_publicacao", { ascending: false })
        .limit(10),
      supabase
        .from("leis_municipais")
        .select("numero, ementa, data_publicacao, resumo_ia")
        .gte("created_at", periodStart)
        .order("data_publicacao", { ascending: false })
        .limit(10),
    ]);

    const projetos = projetosRes.data || [];
    const atuacoes = atuacaoRes.data || [];
    const decretos = decretosRes.data || [];
    const portarias = portariasRes.data || [];
    const leis = leisRes.data || [];

    const totalNovidades = projetos.length + atuacoes.length + decretos.length + portarias.length + leis.length;

    if (totalNovidades === 0) {
      console.log("No updates this week, skipping digest.");
      return new Response(JSON.stringify({ message: "No updates this week" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build email HTML
    const formatDate = (d: string | null) => {
      if (!d) return "";
      try {
        return new Date(d).toLocaleDateString("pt-BR");
      } catch {
        return d;
      }
    };

    let html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:12px;padding:32px 24px;margin-bottom:16px;">
      <h1 style="margin:0 0 4px;font-size:22px;color:#18181b;">📋 Resumo Semanal</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#71717a;">Morrinhos.ai — ${formatDate(periodStart)} a ${formatDate(periodEnd)}</p>
      <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;">
        ${totalNovidades} novidade${totalNovidades > 1 ? "s" : ""} na última semana:
      </p>`;

    if (projetos.length > 0) {
      html += `<h2 style="font-size:16px;color:#18181b;margin:24px 0 12px;border-bottom:1px solid #e4e4e7;padding-bottom:8px;">📄 Projetos de Lei (${projetos.length})</h2>`;
      for (const p of projetos) {
        html += `
        <div style="margin-bottom:12px;padding:12px;background:#fafafa;border-radius:8px;">
          <strong style="font-size:14px;color:#18181b;">${p.tipo} ${p.numero}</strong>
          <span style="font-size:12px;color:#71717a;margin-left:8px;">${formatDate(p.data)}</span>
          <p style="margin:4px 0 0;font-size:13px;color:#3f3f46;">${p.resumo_simples || p.ementa}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#a1a1aa;">Autor: ${p.autor_texto}</p>
        </div>`;
      }
    }

    if (atuacoes.length > 0) {
      html += `<h2 style="font-size:16px;color:#18181b;margin:24px 0 12px;border-bottom:1px solid #e4e4e7;padding-bottom:8px;">🏛️ Atuação Parlamentar (${atuacoes.length})</h2>`;
      for (const a of atuacoes) {
        html += `
        <div style="margin-bottom:12px;padding:12px;background:#fafafa;border-radius:8px;">
          <strong style="font-size:14px;color:#18181b;">${a.tipo} ${a.numero}</strong>
          <span style="font-size:12px;color:#71717a;margin-left:8px;">${formatDate(a.data)}</span>
          <p style="margin:4px 0 0;font-size:13px;color:#3f3f46;">${a.resumo || a.descricao}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#a1a1aa;">Autor: ${a.autor_texto}</p>
        </div>`;
      }
    }

    if (decretos.length > 0) {
      html += `<h2 style="font-size:16px;color:#18181b;margin:24px 0 12px;border-bottom:1px solid #e4e4e7;padding-bottom:8px;">📜 Decretos (${decretos.length})</h2>`;
      for (const d of decretos) {
        html += `
        <div style="margin-bottom:12px;padding:12px;background:#fafafa;border-radius:8px;">
          <strong style="font-size:14px;color:#18181b;">Decreto ${d.numero}</strong>
          <span style="font-size:12px;color:#71717a;margin-left:8px;">${formatDate(d.data_publicacao)}</span>
          <p style="margin:4px 0 0;font-size:13px;color:#3f3f46;">${d.resumo_ia || d.ementa}</p>
        </div>`;
      }
    }

    if (portarias.length > 0) {
      html += `<h2 style="font-size:16px;color:#18181b;margin:24px 0 12px;border-bottom:1px solid #e4e4e7;padding-bottom:8px;">📋 Portarias (${portarias.length})</h2>`;
      for (const p of portarias) {
        html += `
        <div style="margin-bottom:12px;padding:12px;background:#fafafa;border-radius:8px;">
          <strong style="font-size:14px;color:#18181b;">Portaria ${p.numero}</strong>
          <span style="font-size:12px;color:#71717a;margin-left:8px;">${formatDate(p.data_publicacao)}</span>
          <p style="margin:4px 0 0;font-size:13px;color:#3f3f46;">${p.resumo_ia || p.ementa}</p>
        </div>`;
      }
    }

    if (leis.length > 0) {
      html += `<h2 style="font-size:16px;color:#18181b;margin:24px 0 12px;border-bottom:1px solid #e4e4e7;padding-bottom:8px;">⚖️ Leis Municipais (${leis.length})</h2>`;
      for (const l of leis) {
        html += `
        <div style="margin-bottom:12px;padding:12px;background:#fafafa;border-radius:8px;">
          <strong style="font-size:14px;color:#18181b;">Lei ${l.numero}</strong>
          <span style="font-size:12px;color:#71717a;margin-left:8px;">${formatDate(l.data_publicacao)}</span>
          <p style="margin:4px 0 0;font-size:13px;color:#3f3f46;">${l.resumo_ia || l.ementa}</p>
        </div>`;
      }
    }

    html += `
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e4e4e7;text-align:center;">
        <a href="${Deno.env.get("SITE_URL") || "https://morrinhos.ai"}" style="display:inline-block;padding:10px 24px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
          Ver tudo no Morrinhos.ai
        </a>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#a1a1aa;margin-top:16px;">
      Você recebeu este e-mail porque se inscreveu no Morrinhos.ai.<br/>
      Morrinhos, GO — Transparência cidadã independente.
    </p>
  </div>
</body>
</html>`;

    // Fetch verified subscribers
    const { data: subscribers, error: subError } = await supabase
      .from("subscriptions")
      .select("id, email")
      .eq("is_paused", false);

    if (subError) throw subError;

    if (!subscribers || subscribers.length === 0) {
      console.log("No active subscribers found.");
      return new Response(JSON.stringify({ message: "No active subscribers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending digest to ${subscribers.length} subscriber(s)...`);

    let sentCount = 0;
    let errorCount = 0;

    for (const sub of subscribers) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: [sub.email],
            subject: `📋 Resumo Semanal — ${totalNovidades} novidade${totalNovidades > 1 ? "s" : ""} em Morrinhos`,
            html,
          }),
        });

        const resData = await res.json();

        if (!res.ok) {
          console.error(`Failed to send to ${sub.email}:`, resData);
          errorCount++;
          await supabase.from("email_digest_log").insert({
            subscription_id: sub.id,
            period_start: periodStart,
            period_end: periodEnd,
            status: "error",
            error_message: JSON.stringify(resData),
          });
        } else {
          sentCount++;
          await supabase.from("email_digest_log").insert({
            subscription_id: sub.id,
            period_start: periodStart,
            period_end: periodEnd,
            status: "sent",
          });
        }
      } catch (err) {
        console.error(`Error sending to ${sub.email}:`, err);
        errorCount++;
      }
    }

    console.log(`Digest complete: ${sentCount} sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        total_subscribers: subscribers.length,
        sent: sentCount,
        errors: errorCount,
        novidades: totalNovidades,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Digest error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

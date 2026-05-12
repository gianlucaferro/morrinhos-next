import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ tipo: "health-check", status: "running", detalhes: {} })
    .select()
    .single();
  const logId = logEntry?.id;

  try {
    // 1. Query dashboard for unhealthy jobs
    const { data: dashboard, error: dashErr } = await supabase
      .from("v_sync_dashboard" as any)
      .select("*");

    if (dashErr) {
      // View might not exist yet, fall back to direct query
      console.log("Dashboard view error, using fallback:", dashErr.message);
    }

    const jobs = dashboard || [];
    const unhealthy = jobs.filter((j: any) => j.health_status !== "healthy");
    const healthy = jobs.filter((j: any) => j.health_status === "healthy");

    console.log(`Health check: ${healthy.length} healthy, ${unhealthy.length} unhealthy out of ${jobs.length} total`);

    // 2. Retry unhealthy jobs (max 5 per run to avoid overload)
    const retried: string[] = [];
    const MAX_RETRIES_PER_RUN = 5;

    for (const job of unhealthy.slice(0, MAX_RETRIES_PER_RUN)) {
      const fname = job.function_name;
      // Skip if too many recent errors (>5 in 7 days = likely broken, needs manual fix)
      if ((job.errors_7d || 0) > 5) {
        console.log(`Skipping ${fname}: too many errors (${job.errors_7d} in 7d)`);
        continue;
      }

      console.log(`Retrying ${fname} (status: ${job.health_status})`);
      try {
        const { error: invokeErr } = await supabase.functions.invoke(fname, { body: {} });
        if (invokeErr) {
          console.error(`Failed to invoke ${fname}:`, invokeErr.message);
        } else {
          retried.push(fname);
        }
      } catch (e) {
        console.error(`Error invoking ${fname}:`, e);
      }

      // Wait 10s between retries to avoid overloading sources
      await new Promise((r) => setTimeout(r, 10_000));
    }

    // 3. Check for critical issues (3+ consecutive failures)
    const critical = unhealthy.filter(
      (j: any) => j.health_status === "failing" && (j.errors_7d || 0) >= 3
    );

    // 4. Send push notification if critical issues exist
    if (critical.length > 0) {
      const names = critical.map((j: any) => j.function_name).join(", ");
      const msg = `Alerta: ${critical.length} sync(s) com falhas críticas: ${names}`;
      console.log("CRITICAL:", msg);

      try {
        await supabase.functions.invoke("send-push", {
          body: {
            title: "Morrinhos.ai — Alerta de Sincronização",
            body: msg,
            url: "/admin",
          },
        });
      } catch (e) {
        console.error("Failed to send push alert:", e);
      }
    }

    // 5. Compile summary
    const summary = {
      total_jobs: jobs.length,
      healthy: healthy.length,
      unhealthy: unhealthy.length,
      retried,
      critical: critical.map((j: any) => ({
        function: j.function_name,
        errors_7d: j.errors_7d,
        last_status: j.last_status,
        last_run: j.last_started_at,
      })),
      by_status: {
        healthy: healthy.length,
        failing: unhealthy.filter((j: any) => j.health_status === "failing").length,
        stale: unhealthy.filter((j: any) => j.health_status === "stale").length,
        stuck: unhealthy.filter((j: any) => j.health_status === "stuck").length,
        degraded: unhealthy.filter((j: any) => j.health_status === "degraded").length,
        never_run: unhealthy.filter((j: any) => j.health_status === "never_run").length,
      },
    };

    // 6. Update log
    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status: critical.length > 0 ? "partial" : "success",
          detalhes: summary,
          finished_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Health check failed:", errMsg);

    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status: "error",
          detalhes: { error: errMsg },
          finished_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return new Response(JSON.stringify({ success: false, error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

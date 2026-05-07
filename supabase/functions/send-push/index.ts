import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPID_PUBLIC_KEY = "BLF0Fx0NaW60vTV-1fM6jX-TrAWkC5A7Q9ksc4dwdIozzwrW4VwgR2GU4S3BuAlqr-XN0DA7i6lAJRtBsDqmsS4";
const VAPID_SUBJECT = "mailto:gf5000air@hotmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, topic, url, dedup_key } = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Deduplication: check if we already sent this notification
    if (dedup_key) {
      const { data: existing } = await supabase
        .from("sync_log")
        .select("id")
        .eq("tipo", `push_${dedup_key}`)
        .eq("status", "success")
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ sent: 0, message: "Already notified", dedup_key }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Configure web-push VAPID — extract private key even if full JSON was saved
    let cleanPrivateKey = vapidPrivateKey.trim();
    // If the secret contains JSON (e.g. {"publicKey":"...","privateKey":"..."}), extract privateKey
    if (cleanPrivateKey.startsWith("{")) {
      try {
        const parsed = JSON.parse(cleanPrivateKey);
        cleanPrivateKey = parsed.privateKey || parsed.private_key || parsed.privKey || cleanPrivateKey;
      } catch (_) {
        // not JSON, continue
      }
    }
    cleanPrivateKey = cleanPrivateKey.replace(/[=\s\n\r"']/g, "");
    console.log(`VAPID key length: ${cleanPrivateKey.length}, matches base64url: ${/^[A-Za-z0-9\-_]+$/.test(cleanPrivateKey)}`);
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, cleanPrivateKey);

    // Fetch subscriptions
    let query = supabase.from("push_subscriptions").select("*");
    if (topic) {
      query = query.eq("topic", topic);
    }
    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      url: url || "/",
      timestamp: Date.now(),
    });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth,
          },
        };

        await webpush.sendNotification(pushSubscription, payload, { TTL: 86400 });
        sent++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        } else {
          console.error(`Push error for ${sub.id}: ${err.message}`);
        }
        failed++;
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    // Log successful notification for deduplication
    if (dedup_key && sent > 0) {
      await supabase.from("sync_log").insert({
        tipo: `push_${dedup_key}`,
        status: "success",
        detalhes: { title, sent, failed, topic },
        finished_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ sent, failed, expired_cleaned: expiredEndpoints.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send push error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { data: establishments, error: fetchErr } = await sb
      .from("zap_establishments")
      .select("id, name, whatsapp, category, status, click_count, created_at")
      .order("name");

    if (fetchErr) throw fetchErr;

    const snapshot = establishments || [];

    const { error: insertErr } = await sb.from("zap_backups").insert({
      snapshot: JSON.parse(JSON.stringify(snapshot)),
      total_records: snapshot.length,
    });

    if (insertErr) throw insertErr;

    // Keep only last 90 days of backups
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    await sb.from("zap_backups").delete().lt("created_at", cutoff.toISOString());

    console.log(`Backup completed: ${snapshot.length} records`);

    return new Response(JSON.stringify({ ok: true, records: snapshot.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Backup error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function validateAdminToken(
  supabase: ReturnType<typeof createClient>,
  token: string
): Promise<boolean> {
  if (!token) return false;
  const tokenHash = await hashToken(token);
  const { data } = await supabase
    .from("admin_sessions")
    .select("expires_at")
    .eq("id", "singleton")
    .eq("token_hash", tokenHash)
    .single();
  if (!data) return false;
  return new Date(data.expires_at) > new Date();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { admin_token, action, backup_id } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate admin session
    if (!admin_token || !(await validateAdminToken(supabase, admin_token))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "validate") {
      // Just validate token - used on page load
      return new Response(JSON.stringify({ valid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fetch_all") {
      // Fetch all establishments and suggestions (admin-only data)
      const [estResult, sugResult] = await Promise.all([
        supabase
          .from("zap_establishments")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("zap_suggestions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (estResult.error) throw estResult.error;
      if (sugResult.error) throw sugResult.error;

      const establishments = estResult.data || [];
      const pending = establishments.filter((e: any) => e.status === "pending");
      const approved = establishments.filter((e: any) => e.status === "approved");
      const rejected = establishments.filter((e: any) => e.status === "rejected");

      return new Response(
        JSON.stringify({
          pending,
          approved,
          rejected,
          suggestions: sugResult.data || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "fetch_backups") {
      const { data, error } = await supabase
        .from("zap_backups")
        .select("id, created_at, total_records")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return new Response(JSON.stringify({ backups: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "download_backup") {
      const query = supabase.from("zap_backups").select("*");
      const { data, error } = backup_id
        ? await query.eq("id", backup_id).single()
        : await query.order("created_at", { ascending: false }).limit(1).single();
      if (error) throw error;
      return new Response(JSON.stringify({ backup: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

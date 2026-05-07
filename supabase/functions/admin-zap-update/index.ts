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

async function validateAdminToken(supabase: ReturnType<typeof createClient>, token: string): Promise<boolean> {
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
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { id, action, name, whatsapp, category, status, admin_token } = await req.json();

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

    if (!id || !action) {
      return new Response(JSON.stringify({ error: "Missing id or action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_status") {
      if (!status || !["pending", "approved", "rejected"].includes(status)) {
        return new Response(JSON.stringify({ error: "Invalid status" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("zap_establishments")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    } else if (action === "edit") {
      if (!name?.trim() || !whatsapp?.trim()) {
        return new Response(JSON.stringify({ error: "Name and whatsapp required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("zap_establishments")
        .update({
          name: name.trim(),
          whatsapp: whatsapp.replace(/\D/g, ""),
          category: category === "none" ? null : category || null,
        })
        .eq("id", id);
      if (error) throw error;
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

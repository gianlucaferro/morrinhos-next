import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const body = await req.json();
    const { action, id, updates, admin_token } = body;

    // Token vem PRIMEIRO do body (admin_token) — Supabase JS injeta o anon key
    // automaticamente no header Authorization e sobrescreve qualquer Bearer
    // custom passado em headers, entao o body e' a fonte confiavel.
    // Fallback pra header pra retrocompat com chamadas direto via curl.
    let token = (admin_token ?? "").trim();
    if (!token) {
      const authHeader = req.headers.get("authorization") || "";
      const headerToken = authHeader.replace("Bearer ", "").trim();
      // So usa header se NAO for o anon key (caso comum em chamadas via JS)
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
      if (headerToken && headerToken !== anonKey) {
        token = headerToken;
      }
    }

    if (!token) {
      return new Response(JSON.stringify({ error: "Token ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Hash token and verify admin session
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { data: session } = await supabase
      .from("admin_sessions")
      .select("expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!session || new Date(session.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!id || typeof id !== "string") {
      return new Response(JSON.stringify({ error: "ID inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { error } = await supabase
        .from("classificados")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      if (!updates || typeof updates !== "object") {
        return new Response(JSON.stringify({ error: "Updates inválidos" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Whitelist allowed fields
      const allowed = [
        "status", "denuncias", "titulo", "descricao", "categoria",
        "preco", "preco_tipo", "bairro", "nome", "whatsapp", "fotos",
      ];
      const sanitized: Record<string, unknown> = {};
      for (const key of allowed) {
        if (key in updates) sanitized[key] = updates[key];
      }
      const { error } = await supabase
        .from("classificados")
        .update(sanitized)
        .eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

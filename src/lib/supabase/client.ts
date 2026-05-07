"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para o BROWSER (Client Components).
 * Gerencia sessão, auth, realtime.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

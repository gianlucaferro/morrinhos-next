import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase PÚBLICO (sem cookies, sem auth).
 * Usar para dados públicos e cacheaveis em Server Components.
 * NÃO usar para operações autenticadas.
 */
export function createPublicSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

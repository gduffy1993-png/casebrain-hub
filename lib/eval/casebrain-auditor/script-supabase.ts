import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Script-safe Supabase admin client (auditor read-only corpus — no server-only import). */
let client: SupabaseClient | null = null;

export function getAuditorSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for --corpus real (load .env.local).",
    );
  }
  client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

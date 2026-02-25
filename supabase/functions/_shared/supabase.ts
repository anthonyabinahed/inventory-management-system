import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Create a Supabase admin client using the service role key.
 * Bypasses RLS — use only in Edge Functions for trusted server-side operations.
 */
export function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    // When building without env vars (e.g. CI, static export), avoid throwing.
    // Callers should respond with an error and avoid attempting database operations.
    return null;
  }

  cachedClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  return cachedClient;
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // When building or running without environment variables, avoid throwing.
    // Client features will not work until these are set.
    // eslint-disable-next-line no-console
    console.warn('Supabase client env vars are not set. Realtime features will not work.');
    return null;
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: { params: { eventsPerSecond: 10 } },
    auth: {
      persistSession: false,
    },
  });

  return cachedClient;
}

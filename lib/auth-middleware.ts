import { NextRequest } from 'next/server';
import { getSupabaseServer } from './supabaseServer';

export async function verifyUserIdentity(request: NextRequest, userId: string): Promise<boolean> {
  const supabase = getSupabaseServer();
  if (!supabase) return false;

  // Verify user exists and is active
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .eq('is_active', true)
    .single();

  return !error && !!data;
}
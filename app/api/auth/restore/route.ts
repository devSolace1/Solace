import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@lib/supabaseServer';
import crypto from 'crypto';

type Body = {
  recoveryKey: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  if (!body?.recoveryKey) {
    return NextResponse.json({ error: 'Missing recovery key' }, { status: 400 });
  }

  const recoveryHash = crypto.createHash('sha256').update(body.recoveryKey).digest('hex');

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('recovery_keys')
    .select('user_id, users ( role )')
    .eq('recovery_key_hash', recoveryHash)
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Invalid recovery key' }, { status: 404 });
  }

  const row = data as any;
  const role = row?.users?.role ?? 'participant';
  return NextResponse.json({ userId: row.user_id, role });
}

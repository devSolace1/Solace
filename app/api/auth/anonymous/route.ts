import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@lib/supabaseServer';
import crypto from 'crypto';

type Body = {
  userId: string;
  recoveryKey: string;
  role?: 'participant' | 'counselor' | 'moderator';
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  if (!body?.userId || !body?.recoveryKey) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const role = body.role ?? 'participant';
  const recoveryHash = crypto.createHash('sha256').update(body.recoveryKey).digest('hex');

  // Upsert user record
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  const { error: userError } = await supabase
    .from('users')
    .upsert(
      {
        id: body.userId,
        role,
        anonymous_label: 'Anonymous',
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('id');

  if (userError) {
    console.error('Supabase user upsert error', userError);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }

  const { error: keyError } = await supabase
    .from('recovery_keys')
    .upsert({ user_id: body.userId, recovery_key_hash: recoveryHash }, { onConflict: 'user_id' });

  if (keyError) {
    console.error('Supabase recovery key upsert error', keyError);
    return NextResponse.json({ error: 'Failed to store recovery key' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok', userId: body.userId, role });
}

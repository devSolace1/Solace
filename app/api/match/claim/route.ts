import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@lib/supabaseServer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionId = body?.sessionId as string;
  const counselorId = body?.counselorId as string;

  if (!sessionId || !counselorId) {
    return NextResponse.json({ error: 'Missing sessionId or counselorId' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from('sessions')
    .update({ counselor_id: counselorId, status: 'active', updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from('match_history').insert({
    session_id: sessionId,
    participant_id: session.participant_id,
    counselor_id: counselorId,
    outcome: 'completed',
  });

  return NextResponse.json({ status: 'ok' });
}

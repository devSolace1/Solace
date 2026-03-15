import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@lib/supabaseServer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionId = body?.sessionId as string;
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
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

  // Create panic alert
  await supabase
    .from('panic_alerts')
    .insert({ session_id: sessionId, user_id: session.participant_id });

  // Update session to panic mode
  await supabase
    .from('sessions')
    .update({ panic: true, status: 'waiting', updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  // Try to match with priority (high severity)
  const { data: counselorData } = await supabase.rpc('find_available_counselor_v2', {
    severity: 'high',
    preferences: []
  });
  if (counselorData && counselorData.length > 0) {
    const counselorId = counselorData[0].id;
    await supabase
      .from('sessions')
      .update({ counselor_id: counselorId, status: 'active', updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  // Increment analytics
  await supabase.rpc('increment_analytics', { metric_name: 'panic_alerts_triggered' });

  return NextResponse.json({ status: 'ok' });
}

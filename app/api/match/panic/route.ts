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

  await supabase
    .from('sessions')
    .update({ panic: true, status: 'waiting', updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  // Try to match again
  const { data: counselorData } = await supabase.rpc('find_available_counselor');
  if (counselorData && counselorData.length > 0) {
    const counselorId = counselorData[0].id;
    await supabase
      .from('sessions')
      .update({ counselor_id: counselorId, status: 'active', updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  return NextResponse.json({ status: 'ok' });
}

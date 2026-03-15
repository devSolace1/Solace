import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@lib/supabaseServer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const userId = body?.userId as string;
  const criteria = body?.criteria as { emotionalSeverity?: 'low' | 'medium' | 'high'; preferences?: string[] } | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // Create a new session in waiting state
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      participant_id: userId,
      status: 'waiting',
      metadata: criteria ? { criteria } : {}
    })
    .select('*')
    .single();

  if (sessionError || !sessionData) {
    return NextResponse.json({ error: sessionError?.message ?? 'Failed to create session' }, { status: 500 });
  }

  // Try to match with an available counselor using improved logic
  const { data: counselorData, error: counselorError } = await supabase.rpc('find_available_counselor_v2', {
    severity: criteria?.emotionalSeverity || 'medium',
    preferences: criteria?.preferences || []
  });

  if (counselorError) {
    console.warn('Counselor match rpc error', counselorError);
  }

  let updatedSession = sessionData;

  if (counselorData && counselorData.length > 0 && counselorData[0]?.id) {
    const counselorId = counselorData[0].id as string;
    const { data: updated, error: updateError } = await supabase
      .from('sessions')
      .update({ counselor_id: counselorId, status: 'active', updated_at: new Date().toISOString() })
      .eq('id', sessionData.id)
      .select('*')
      .single();

    if (!updateError && updated) {
      updatedSession = updated;
    }
  }

  return NextResponse.json({
    sessionId: updatedSession.id,
    status: updatedSession.status,
    counselorId: updatedSession.counselor_id,
  });
}

import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@lib/supabaseServer';

export async function GET() {
  // Active sessions
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  const { data: activeSessions, error: activeError } = await supabase
    .from('sessions')
    .select(`id, created_at, updated_at, status, participant_id, counselor_id`)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20);

  if (activeError) {
    return NextResponse.json({ error: activeError.message }, { status: 500 });
  }

  // Waiting queue
  const { data: waitingSessions, error: waitingError } = await supabase
    .from('sessions')
    .select(`id, created_at, participant_id`)
    .eq('status', 'waiting')
    .order('created_at', { ascending: true })
    .limit(20);

  if (waitingError) {
    return NextResponse.json({ error: waitingError.message }, { status: 500 });
  }

  // Mood trends
  const { data: moodTrends, error: moodError } = await supabase.rpc('mood_trend_summary');

  if (moodError) {
    console.warn('Mood trend rpc error', moodError);
  }

  // Open reports
  const { count: openReports } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('resolved', false);

  // Resolve labels for participants and counselors
  const participantIds = Array.from(new Set((activeSessions ?? []).map((s) => s.participant_id).concat((waitingSessions ?? []).map((s) => s.participant_id))));
  const counselorIds = Array.from(new Set((activeSessions ?? []).map((s) => s.counselor_id).filter(Boolean) as string[]));
  const allUserIds = Array.from(new Set([...participantIds, ...counselorIds]));

  const { data: users } = await supabase
    .from('users')
    .select('id, anonymous_label')
    .in('id', allUserIds);

  const labelById = new Map<string, string>();
  users?.forEach((u) => labelById.set(u.id, u.anonymous_label));

  const mappedActive = (activeSessions ?? []).map((session) => ({
    id: session.id,
    created_at: session.created_at,
    updated_at: session.updated_at,
    status: session.status,
    participant_label: labelById.get(session.participant_id) ?? 'Anonymous',
    counselor_label: session.counselor_id ? labelById.get(session.counselor_id) ?? 'Counselor' : undefined,
  }));

  const mappedWaiting = (waitingSessions ?? []).map((session) => ({
    id: session.id,
    created_at: session.created_at,
    participant_label: labelById.get(session.participant_id) ?? 'Anonymous',
  }));

  return NextResponse.json({
    activeSessions: mappedActive,
    waitingSessions: mappedWaiting,
    moodTrends: moodTrends ?? [],
    openReports: openReports ?? 0,
  });
}

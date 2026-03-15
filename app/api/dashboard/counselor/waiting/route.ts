import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../../lib/supabaseServer';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, participant_id, created_at, metadata')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) throw error;

    const participantIds = Array.from(new Set((sessions ?? []).map((s: any) => s.participant_id)));
    const { data: users } = await supabase
      .from('users')
      .select('id, anonymous_label')
      .in('id', participantIds);

    const labelById = new Map<string, string>();
    users?.forEach((u: any) => labelById.set(u.id, u.anonymous_label));

    const mapped = (sessions ?? []).map((session: any) => ({
      id: session.id,
      joinedAt: session.created_at,
      waitTime: Math.max(0, Math.floor((Date.now() - new Date(session.created_at).getTime()) / 60000)),
      participantLabel: labelById.get(session.participant_id) ?? 'Anonymous',
      riskLevel: session.metadata?.riskLevel || 'medium',
      preferredTopics: session.metadata?.preferredTopics || []
    }));

    return NextResponse.json({ users: mapped });
  } catch (err) {
    console.error('Counselor waiting users error:', err);
    return NextResponse.json({ error: 'Failed to load waiting users' }, { status: 500 });
  }
}

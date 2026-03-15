import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../../lib/supabaseServer';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('X-User-Id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, participant_id, status, created_at, updated_at, ended_at, panic')
      .eq('counselor_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Resolve anonymous labels for participants
    const participantIds = Array.from(new Set((sessions ?? []).map((s: any) => s.participant_id)));
    const { data: users } = await supabase
      .from('users')
      .select('id, anonymous_label')
      .in('id', participantIds);

    const labelById = new Map<string, string>();
    users?.forEach((u: any) => labelById.set(u.id, u.anonymous_label));

    const mapped = (sessions ?? []).map((session: any) => ({
      id: session.id,
      participantLabel: labelById.get(session.participant_id) ?? 'Anonymous',
      status: session.status,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      panic: session.panic || false
    }));

    return NextResponse.json({ sessions: mapped });
  } catch (err) {
    console.error('Counselor sessions error:', err);
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}

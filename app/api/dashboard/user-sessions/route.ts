import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Get user's sessions with message counts
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        id,
        created_at,
        status,
        messages(count)
      `)
      .eq('participant_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedSessions = sessions.map((s: any) => ({
      id: s.id,
      createdAt: s.created_at,
      status: s.status,
      messageCount: s.messages?.[0]?.count || 0,
    }));

    return NextResponse.json({ sessions: formattedSessions });
  } catch (err) {
    console.error('User sessions error:', err);
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}
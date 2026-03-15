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
    // Active sessions assigned to this counselor
    const { count: activeSessions } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('counselor_id', userId)
      .eq('status', 'active');

    // Waiting users (unassigned sessions)
    const { count: waitingUsers } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting');

    // Completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: completedToday } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('counselor_id', userId)
      .eq('status', 'ended')
      .gte('ended_at', today.toISOString());

    // Average session time (based on ended sessions this week)
    const { data: durations } = await supabase
      .from('sessions')
      .select('created_at, ended_at')
      .eq('counselor_id', userId)
      .eq('status', 'ended')
      .gte('ended_at', today.toISOString())
      .limit(50);

    const averageSessionTime = durations && durations.length > 0
      ? durations.reduce((sum: number, s: { created_at: string; ended_at: string | null }) => {
          if (!s.ended_at) return sum;
          const start = new Date(s.created_at).getTime();
          const end = new Date(s.ended_at).getTime();
          return sum + (end - start) / (1000 * 60);
        }, 0) / durations.length
      : 0;

    // Panic alerts assigned to this counselor
    const { count: panicAlerts } = await supabase
      .from('panic_alerts_v6')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_counselor', userId)
      .eq('status', 'active');

    return NextResponse.json({
      activeSessions: activeSessions || 0,
      waitingUsers: waitingUsers || 0,
      completedToday: completedToday || 0,
      averageSessionTime: Math.round(averageSessionTime),
      panicAlerts: panicAlerts || 0
    });
  } catch (err) {
    console.error('Counselor stats error:', err);
    return NextResponse.json({ error: 'Failed to load counselor stats' }, { status: 500 });
  }
}

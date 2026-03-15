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

    // Check if user is moderator
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || user.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get stats
    const [usersResult, sessionsResult, reportsResult, messagesResult, analyticsResult] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('sessions').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('messages').select('id', { count: 'exact' }),
      supabase.from('analytics').select('metric, value').gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    ]);

    const stats = {
      totalUsers: usersResult.count || 0,
      activeSessions: sessionsResult.count || 0,
      pendingReports: reportsResult.count || 0,
      totalMessages: messagesResult.count || 0,
      dailyActiveUsers: analyticsResult.data?.find(a => a.metric === 'daily_active_users')?.value || 0,
      sessionsStarted: analyticsResult.data?.find(a => a.metric === 'sessions_started')?.value || 0,
      panicAlertsTriggered: analyticsResult.data?.find(a => a.metric === 'panic_alerts_triggered')?.value || 0,
      averageSessionDuration: 0, // Would need to calculate from session data
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error('Admin stats error:', err);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
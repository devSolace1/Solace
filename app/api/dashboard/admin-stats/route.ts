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
    const [usersResult, sessionsResult, reportsResult, messagesResult] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('sessions').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('messages').select('id', { count: 'exact' }),
    ]);

    const stats = {
      totalUsers: usersResult.count || 0,
      activeSessions: sessionsResult.count || 0,
      pendingReports: reportsResult.count || 0,
      totalMessages: messagesResult.count || 0,
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error('Admin stats error:', err);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
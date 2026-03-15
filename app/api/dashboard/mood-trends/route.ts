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

    // Get mood logs for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: moodLogs, error } = await supabase
      .from('mood_logs')
      .select('created_at, mood_score, stress_level')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const trends = moodLogs.map((log: any) => ({
      date: log.created_at.split('T')[0], // YYYY-MM-DD
      mood: log.mood_score,
      stress: log.stress_level,
    }));

    return NextResponse.json({ trends });
  } catch (err) {
    console.error('Mood trends error:', err);
    return NextResponse.json({ error: 'Failed to load mood trends' }, { status: 500 });
  }
}
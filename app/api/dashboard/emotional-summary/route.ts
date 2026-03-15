import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';
import { EmotionalStateService } from '../../../../modules/logic-engine/services/EmotionalStateService';

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
    const service = new EmotionalStateService();
    const state = await service.calculateEmotionalState(userId);

    // Upsert into cache table (if exists)
    await supabase.rpc('update_emotional_state', {
      p_user_id: userId,
      p_state: state.currentState,
      p_confidence: state.confidence,
      p_signals: state.signals,
      p_trends: state.trends
    });

    const result = {
      currentState: state.currentState,
      confidence: state.confidence,
      signals: state.signals,
      trends: state.trends,
      weeklyMoodTrend: state.trends.moodImprovement,
      recoveryProgress: Math.round(state.confidence * 100),
      streakDays: state.signals.sessionStreak
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('Emotional summary error:', err);
    return NextResponse.json({ error: 'Failed to load emotional summary' }, { status: 500 });
  }
}

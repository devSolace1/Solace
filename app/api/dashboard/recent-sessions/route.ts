import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';
import { ChatService } from '../../../../modules/chat/services/ChatService';
import { SessionIntelligenceService } from '../../../../modules/logic-engine/services/SessionIntelligenceService';

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
    const chatService = new ChatService();
    const intelligenceService = new SessionIntelligenceService();

    const sessions = await chatService.getUserSessions(userId, 10);

    const enriched = await Promise.all(
      sessions.map(async (session) => {
        const intelligence = await intelligenceService.analyzeSession(session.id);

        const createdAt = session.created_at ? new Date(session.created_at) : new Date();
        const endedAt = session.ended_at ? new Date(session.ended_at) : new Date();
        const durationMinutes = (endedAt.getTime() - createdAt.getTime()) / (1000 * 60);

        return {
          id: session.id,
          status: session.status,
          createdAt: session.created_at,
          messageCount: session.messageCount || 0,
          durationMinutes: Math.max(0, durationMinutes),
          emotionalIntensity: intelligence.fatigueIndicators.emotionalIntensity,
          continuityScore: intelligence.continuityScore
        };
      })
    );

    return NextResponse.json({ sessions: enriched });
  } catch (err) {
    console.error('Recent sessions error:', err);
    return NextResponse.json({ error: 'Failed to load recent sessions' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, messageId, sadnessScore, distressScore, riskLevel } = body as {
    sessionId: string;
    messageId: string;
    sadnessScore: number;
    distressScore: number;
    riskLevel: string;
  };

  if (!sessionId || !messageId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { error } = await supabase
    .from('emotional_signals')
    .insert({
      session_id: sessionId,
      message_id: messageId,
      sadness_score: sadnessScore,
      distress_score: distressScore,
      risk_level: riskLevel
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
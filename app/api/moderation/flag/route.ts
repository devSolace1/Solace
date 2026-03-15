import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, messageId, flagType, severity, reason } = body as {
    sessionId: string;
    messageId: string;
    flagType: string;
    severity: string;
    reason: string;
  };

  if (!sessionId || !flagType || !severity) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { error } = await supabase
    .from('moderation_flags')
    .insert({
      session_id: sessionId,
      message_id: messageId,
      flag_type: flagType,
      severity: severity,
      reason: reason
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
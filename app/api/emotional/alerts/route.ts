import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, messageId, alertType, severity, content } = body as {
    sessionId: string;
    messageId: string;
    alertType: string;
    severity: string;
    content: string;
  };

  if (!sessionId || !alertType || !severity) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { error } = await supabase
    .from('crisis_alerts')
    .insert({
      session_id: sessionId,
      message_id: messageId,
      alert_type: alertType,
      severity: severity,
      content: content
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
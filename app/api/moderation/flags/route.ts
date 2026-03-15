import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@lib/supabaseServer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messageId, sessionId, flaggedBy, flagType, severity, reason } = body as {
    messageId?: string;
    sessionId: string;
    flaggedBy: string;
    flagType: string;
    severity: string;
    reason?: string;
  };

  if (!sessionId || !flaggedBy || !flagType || !severity) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('moderation_flags')
    .insert({
      message_id: messageId,
      session_id: sessionId,
      flagged_by: flaggedBy,
      flag_type: flagType,
      severity,
      reason,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50');

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  let query = supabase
    .from('moderation_flags')
    .select(`
      *,
      sessions:session_id (
        id,
        participant_id,
        counselor_id
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status, reviewedBy, actionTaken } = body as {
    id: string;
    status?: string;
    reviewedBy?: string;
    actionTaken?: string;
  };

  if (!id) {
    return NextResponse.json({ error: 'Missing flag id' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const updateData: any = {};
  if (status) updateData.status = status;
  if (reviewedBy) updateData.reviewed_by = reviewedBy;
  if (actionTaken) updateData.action_taken = actionTaken;
  if (status === 'resolved' || status === 'dismissed') {
    updateData.reviewed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('moderation_flags')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
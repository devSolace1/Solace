import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@lib/supabaseServer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { adminId, actionType, targetUserId, targetSessionId, details, metadata } = body as {
    adminId: string;
    actionType: string;
    targetUserId?: string;
    targetSessionId?: string;
    details?: string;
    metadata?: Record<string, any>;
  };

  if (!adminId || !actionType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('admin_actions')
    .insert({
      admin_id: adminId,
      action_type: actionType,
      target_user_id: targetUserId,
      target_session_id: targetSessionId,
      details,
      metadata
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
  const adminId = searchParams.get('adminId');
  const limit = parseInt(searchParams.get('limit') || '100');

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  let query = supabase
    .from('admin_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (adminId) {
    query = query.eq('admin_id', adminId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
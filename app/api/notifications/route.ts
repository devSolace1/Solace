import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../lib/supabaseServer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, type, title, message, priority, data, expiresAt } = body as {
    userId: string;
    type: string;
    title: string;
    message: string;
    priority?: string;
    data?: Record<string, any>;
    expiresAt?: string;
  };

  if (!userId || !type || !title || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      priority: priority || 'medium',
      data,
      expires_at: expiresAt
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(notification);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, isRead } = body as {
    id: string;
    isRead?: boolean;
  };

  if (!id) {
    return NextResponse.json({ error: 'Missing notification id' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const updateData: any = {};
  if (isRead !== undefined) {
    updateData.is_read = isRead;
  }

  const { data, error } = await supabase
    .from('notifications')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing notification id' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
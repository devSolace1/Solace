import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { roomId, userId, content, anonymous } = body as {
    roomId: string;
    userId: string;
    content: string;
    anonymous: boolean;
  };

  if (!roomId || !userId || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  // Check if room exists and is active
  const { data: room, error: roomError } = await supabase
    .from('support_rooms')
    .select('id, active, moderated')
    .eq('id', roomId)
    .single();

  if (roomError || !room || !room.active) {
    return NextResponse.json({ error: 'Room not found or inactive' }, { status: 404 });
  }

  // If moderated, check for flags
  if (room.moderated) {
    // TODO: Add moderation check here
  }

  const { data, error } = await supabase
    .from('support_room_messages')
    .insert({
      room_id: roomId,
      user_id: userId,
      content,
      anonymous: anonymous || false
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
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('support_room_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
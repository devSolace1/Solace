import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { roomId, action } = body as {
    roomId: string;
    action: 'join' | 'leave';
  };

  if (!roomId || !action) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get room details
    const { data: room, error: roomError } = await supabase
      .from('support_rooms_v4')
      .select('max_participants, current_participants, is_private, status')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'active') {
      return NextResponse.json({ error: 'Room is not active' }, { status: 400 });
    }

    if (action === 'join') {
      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('support_room_participants_v4')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        return NextResponse.json({ error: 'Already a participant' }, { status: 400 });
      }

      // Check room capacity
      if (room.current_participants >= room.max_participants) {
        return NextResponse.json({ error: 'Room is full' }, { status: 400 });
      }

      // Add participant
      const { error: joinError } = await supabase
        .from('support_room_participants_v4')
        .insert({
          room_id: roomId,
          user_id: user.id,
          role: 'participant',
          joined_at: new Date().toISOString()
        });

      if (joinError) {
        console.error('Error joining room:', joinError);
        return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
      }

      // Update participant count
      await supabase
        .from('support_rooms_v4')
        .update({ current_participants: room.current_participants + 1 })
        .eq('id', roomId);

      return NextResponse.json({ success: true, message: 'Joined room successfully' });

    } else if (action === 'leave') {
      // Check if user is a participant
      const { data: participant, error: participantError } = await supabase
        .from('support_room_participants_v4')
        .select('role')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (participantError || !participant) {
        return NextResponse.json({ error: 'Not a participant in this room' }, { status: 400 });
      }

      // Don't allow moderators to leave via this endpoint (they should transfer moderation first)
      if (participant.role === 'moderator') {
        return NextResponse.json({ error: 'Moderators cannot leave rooms directly' }, { status: 400 });
      }

      // Remove participant
      const { error: leaveError } = await supabase
        .from('support_room_participants_v4')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (leaveError) {
        console.error('Error leaving room:', leaveError);
        return NextResponse.json({ error: 'Failed to leave room' }, { status: 500 });
      }

      // Update participant count
      await supabase
        .from('support_rooms_v4')
        .update({ current_participants: room.current_participants - 1 })
        .eq('id', roomId);

      return NextResponse.json({ success: true, message: 'Left room successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in room participation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a participant
    const { data: participant, error: participantError } = await supabase
      .from('support_room_participants_v4')
      .select('role, joined_at')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Not a participant in this room' }, { status: 403 });
    }

    // Get room participants (basic info only)
    const { data: participants, error: participantsError } = await supabase
      .from('support_room_participants_v4')
      .select(`
        user_id,
        role,
        joined_at,
        last_active_at
      `)
      .eq('room_id', roomId);

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
    }

    return NextResponse.json({
      participation: {
        role: participant.role,
        joinedAt: participant.joined_at
      },
      participants: participants || []
    });
  } catch (error) {
    console.error('Error fetching room participation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
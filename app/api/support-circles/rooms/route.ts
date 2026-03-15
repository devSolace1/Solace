import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';
import { SupportCirclesService } from '../../../../lib/services/supportCirclesService';
import { SecurityService } from '../../../../lib/services/securityService';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, category, maxParticipants, isPrivate, tags } = body as {
    name: string;
    description: string;
    category: string;
    maxParticipants?: number;
    isPrivate?: boolean;
    tags?: string[];
  };

  if (!name || !description || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    // Get current user (assuming counselor or admin)
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a verified counselor
    const { data: counselor, error: counselorError } = await supabase
      .from('counselor_profiles')
      .select('verification_status')
      .eq('user_id', user.id)
      .single();

    if (counselorError || counselor?.verification_status !== 'verified') {
      return NextResponse.json({ error: 'Only verified counselors can create support circles' }, { status: 403 });
    }

    // Sanitize input
    const sanitizedName = SecurityService.sanitizeInput(name);
    const sanitizedDescription = SecurityService.sanitizeInput(description);

    // Create support room
    const roomData = {
      name: sanitizedName,
      description: sanitizedDescription,
      category,
      max_participants: maxParticipants || 20,
      is_private: isPrivate || false,
      tags: tags || [],
      created_by: user.id,
      status: 'active'
    };

    const { data: room, error: roomError } = await supabase
      .from('support_rooms_v4')
      .insert(roomData)
      .select()
      .single();

    if (roomError) {
      console.error('Error creating support room:', roomError);
      return NextResponse.json({ error: 'Failed to create support circle' }, { status: 500 });
    }

    // Add creator as moderator
    await supabase
      .from('support_room_participants_v4')
      .insert({
        room_id: room.id,
        user_id: user.id,
        role: 'moderator',
        joined_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        category: room.category,
        maxParticipants: room.max_participants,
        isPrivate: room.is_private,
        tags: room.tags,
        status: room.status
      }
    });
  } catch (error) {
    console.error('Error in support circle creation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const status = searchParams.get('status') || 'active';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    let query = supabase
      .from('support_rooms_v4')
      .select(`
        id,
        name,
        description,
        category,
        max_participants,
        current_participants,
        is_private,
        tags,
        status,
        created_at,
        created_by
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    const { data: rooms, error } = await query;

    if (error) {
      console.error('Error fetching support rooms:', error);
      return NextResponse.json({ error: 'Failed to fetch support circles' }, { status: 500 });
    }

    return NextResponse.json({ rooms: rooms || [] });
  } catch (error) {
    console.error('Error in support circles fetch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { roomId, name, description, maxParticipants, isPrivate, tags, status } = body as {
    roomId: string;
    name?: string;
    description?: string;
    maxParticipants?: number;
    isPrivate?: boolean;
    tags?: string[];
    status?: string;
  };

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

    // Check if user is moderator of this room
    const { data: participant, error: participantError } = await supabase
      .from('support_room_participants_v4')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (participantError || participant?.role !== 'moderator') {
      return NextResponse.json({ error: 'Only moderators can update rooms' }, { status: 403 });
    }

    const updateData: any = {};

    if (name) updateData.name = SecurityService.sanitizeInput(name);
    if (description) updateData.description = SecurityService.sanitizeInput(description);
    if (maxParticipants !== undefined) updateData.max_participants = maxParticipants;
    if (isPrivate !== undefined) updateData.is_private = isPrivate;
    if (tags) updateData.tags = tags;
    if (status) updateData.status = status;

    const { data: room, error } = await supabase
      .from('support_rooms_v4')
      .update(updateData)
      .eq('id', roomId)
      .select()
      .single();

    if (error) {
      console.error('Error updating support room:', error);
      return NextResponse.json({ error: 'Failed to update support circle' }, { status: 500 });
    }

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Error in support circle update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
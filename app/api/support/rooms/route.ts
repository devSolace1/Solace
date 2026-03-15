import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, category, maxParticipants, moderated } = body as {
    name: string;
    description: string;
    category: string;
    maxParticipants: number;
    moderated: boolean;
  };

  if (!name || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('support_rooms')
    .insert({
      name,
      description,
      category,
      max_participants: maxParticipants || 10,
      moderated: moderated || false
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('support_rooms')
    .select('*')
    .eq('active', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
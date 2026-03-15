import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@lib/supabaseServer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { eventType, anonymousData } = body as {
    eventType: string;
    anonymousData?: Record<string, any>;
  };

  if (!eventType) {
    return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('analytics_events')
    .insert({
      event_type: eventType,
      anonymous_data: anonymousData
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
  const eventType = searchParams.get('eventType');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const limit = parseInt(searchParams.get('limit') || '1000');

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  let query = supabase
    .from('analytics_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (eventType) {
    query = query.eq('event_type', eventType);
  }

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
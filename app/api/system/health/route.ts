import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@lib/supabaseServer';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { component, status, message, metrics } = body as {
    component: string;
    status: string;
    message?: string;
    metrics?: Record<string, any>;
  };

  if (!component || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('system_health')
    .insert({
      component,
      status,
      message,
      metrics
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
  const component = searchParams.get('component');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '100');

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  let query = supabase
    .from('system_health')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (component) {
    query = query.eq('component', component);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Health check endpoint for monitoring
export async function HEAD() {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return new Response(null, { status: 503 });
  }

  try {
    const { error } = await supabase.from('system_health').select('id').limit(1);
    if (error) {
      return new Response(null, { status: 503 });
    }
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, counselorId } = body as { sessionId: string; counselorId: string };

    if (!sessionId || !counselorId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const { error } = await supabase
      .from('sessions')
      .update({
        counselor_id: counselorId,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Accept session error:', err);
    return NextResponse.json({ error: 'Failed to accept session' }, { status: 500 });
  }
}

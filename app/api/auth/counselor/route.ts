import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { counselorCode } = await request.json();
    if (!counselorCode || typeof counselorCode !== 'string') {
      return NextResponse.json({ error: 'Counselor code required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Verify counselor exists in users and has a profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('counselor_code', counselorCode)
      .eq('role', 'counselor')
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid counselor code' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('counselor_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Counselor profile not found' }, { status: 401 });
    }

    return NextResponse.json({ userId: user.id });
  } catch (err) {
    console.error('Counselor login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
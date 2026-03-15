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

    // Find or create counselor
    let { data: user, error } = await supabase
      .from('users')
      .select('id, role')
      .eq('counselor_code', counselorCode)
      .eq('role', 'counselor')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is no rows
      throw error;
    }

    if (!user) {
      // Create new counselor
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          role: 'counselor',
          counselor_code: counselorCode,
          anonymous_label: `Counselor ${counselorCode}`,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      user = { id: newUser.id, role: 'counselor' };
    }

    return NextResponse.json({ userId: user.id });
  } catch (err) {
    console.error('Counselor login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
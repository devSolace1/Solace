import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';
import { CounselorMatcherService } from '../../../../services/counselorMatcher';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, sessionId, riskLevel, specialization } = body as {
    userId: string;
    sessionId: string;
    riskLevel: string;
    specialization?: string;
  };

  if (!userId || !sessionId || !riskLevel) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  // Get available counselors
  const { data: counselors, error: counselorsError } = await supabase
    .from('users')
    .select('id, specialization, current_load')
    .eq('role', 'counselor')
    .eq('available', true);

  if (counselorsError || !counselors) {
    return NextResponse.json({ error: 'No counselors available' }, { status: 404 });
  }

  // Calculate match scores
  const matches = counselors.map(counselor => ({
    counselorId: counselor.id,
    score: CounselorMatcherService.calculateMatchScore(
      {
        id: counselor.id,
        specializations: counselor.specialization ? [counselor.specialization] : [],
        experience: 1, // Default experience
        currentLoad: counselor.current_load || 0,
        isAvailable: true
      },
      {
        emotionalSeverity: riskLevel as 'low' | 'medium' | 'high' | 'crisis',
        userPreferences: specialization ? [specialization] : []
      }
    )
  }));

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  const bestMatch = matches[0];

  if (!bestMatch) {
    return NextResponse.json({ error: 'No suitable match found' }, { status: 404 });
  }

  // Update session with matched counselor
  const { error: updateError } = await supabase
    .from('chat_sessions')
    .update({ counselor_id: bestMatch.counselorId })
    .eq('id', sessionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    counselorId: bestMatch.counselorId,
    score: bestMatch.score
  });
}
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';
import { CounselorService } from '../../../../lib/services/counselorService';
import { SecurityService } from '../../../../lib/services/securityService';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { counselorId, sessionId, rating, feedback, categories } = body as {
    counselorId: string;
    sessionId: string;
    rating: number;
    feedback?: string;
    categories?: string[];
  };

  if (!counselorId || !sessionId || rating === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
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

    // Verify the session belongs to the user and involved this counselor
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('counselor_id, status')
      .eq('id', sessionId)
      .eq('participant_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
    }

    if (session.counselor_id !== counselorId) {
      return NextResponse.json({ error: 'Counselor mismatch' }, { status: 400 });
    }

    if (session.status !== 'completed') {
      return NextResponse.json({ error: 'Can only provide feedback for completed sessions' }, { status: 400 });
    }

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('counselor_feedback_v4')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (existingFeedback) {
      return NextResponse.json({ error: 'Feedback already provided for this session' }, { status: 400 });
    }

    // Sanitize feedback
    const sanitizedFeedback = feedback ? SecurityService.sanitizeInput(feedback) : null;

    // Create feedback
    const { data: feedbackRecord, error: feedbackError } = await supabase
      .from('counselor_feedback_v4')
      .insert({
        counselor_id: counselorId,
        user_id: user.id,
        session_id: sessionId,
        rating,
        feedback: sanitizedFeedback,
        categories: categories || [],
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (feedbackError) {
      console.error('Error creating feedback:', feedbackError);
      return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
    }

    // Update counselor reputation
    await CounselorService.updateCounselorReputation(counselorId);

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedbackRecord.id,
        rating: feedbackRecord.rating,
        feedback: feedbackRecord.feedback,
        categories: feedbackRecord.categories,
        createdAt: feedbackRecord.created_at
      }
    });
  } catch (error) {
    console.error('Error in feedback submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const counselorId = searchParams.get('counselorId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

  if (!counselorId) {
    return NextResponse.json({ error: 'Counselor ID required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    // Get current user (optional - for filtering own feedback)
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('counselor_feedback_v4')
      .select(`
        id,
        rating,
        feedback,
        categories,
        created_at,
        user_id
      `)
      .eq('counselor_id', counselorId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // If user is authenticated, include their own feedback
    if (user) {
      query = query.eq('user_id', user.id);
    }

    const { data: feedback, error } = await query;

    if (error) {
      console.error('Error fetching feedback:', error);
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
    }

    // Get counselor stats
    const stats = await CounselorService.getCounselorStats(counselorId);

    return NextResponse.json({
      feedback: feedback || [],
      stats
    });
  } catch (error) {
    console.error('Error in feedback fetch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
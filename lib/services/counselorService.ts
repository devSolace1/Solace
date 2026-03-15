import { CounselorReputation, CounselorStats, CounselorFeedback } from '../../types';
import { getSupabaseServer } from '../supabaseServer';

export class CounselorService {
  static async getCounselorProfile(userId: string) {
    const supabase = getSupabaseServer();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('counselor_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching counselor profile:', error);
      return null;
    }

    return data;
  }

  static async updateCounselorProfile(userId: string, updates: Partial<any>) {
    const supabase = getSupabaseServer();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('counselor_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating counselor profile:', error);
      return null;
    }

    return data;
  }

  static async getCounselorStats(counselorId: string, periodStart?: string, periodEnd?: string) {
    const supabase = getSupabaseServer();
    if (!supabase) return [];

    let query = supabase
      .from('counselor_stats')
      .select('*')
      .eq('counselor_id', counselorId)
      .order('period_end', { ascending: false });

    if (periodStart) {
      query = query.gte('period_start', periodStart);
    }

    if (periodEnd) {
      query = query.lte('period_end', periodEnd);
    }

    const { data, error } = await query.limit(12); // Last 12 periods

    if (error) {
      console.error('Error fetching counselor stats:', error);
      return [];
    }

    return data;
  }

  static async calculateCounselorReputation(counselorId: string): Promise<CounselorReputation | null> {
    const supabase = getSupabaseServer();
    if (!supabase) return null;

    try {
      // Get feedback from last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: feedback, error } = await supabase
        .from('counselor_feedback')
        .select('helpfulness_rating, response_quality_rating, empathy_rating, session_completion_rating')
        .eq('counselor_id', counselorId)
        .gte('created_at', ninetyDaysAgo.toISOString());

      if (error || !feedback || feedback.length < 5) {
        return {
          counselorId,
          reputationScore: 0,
          totalRatings: feedback?.length || 0,
          avgRatings: { helpfulness: 0, quality: 0, empathy: 0, completion: 0 },
          lastCalculated: new Date().toISOString()
        };
      }

      // Calculate averages
      const avgRatings = {
        helpfulness: feedback.reduce((sum, f) => sum + (f.helpfulness_rating || 0), 0) / feedback.length,
        quality: feedback.reduce((sum, f) => sum + (f.response_quality_rating || 0), 0) / feedback.length,
        empathy: feedback.reduce((sum, f) => sum + (f.empathy_rating || 0), 0) / feedback.length,
        completion: feedback.reduce((sum, f) => sum + (f.session_completion_rating || 0), 0) / feedback.length
      };

      // Weighted reputation score (0-100)
      const reputationScore = Math.min(100, Math.max(0,
        (avgRatings.helpfulness * 0.3 +
         avgRatings.quality * 0.25 +
         avgRatings.empathy * 0.25 +
         avgRatings.completion * 0.2) * 20
      ));

      return {
        counselorId,
        reputationScore,
        totalRatings: feedback.length,
        avgRatings,
        lastCalculated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating counselor reputation:', error);
      return null;
    }
  }

  static async submitFeedback(feedback: Omit<CounselorFeedback, 'id' | 'createdAt'>): Promise<boolean> {
    const supabase = getSupabaseServer();
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('counselor_feedback')
        .insert({
          counselor_id: feedback.counselorId,
          session_id: feedback.sessionId,
          participant_id: feedback.participantId,
          helpfulness_rating: feedback.helpfulnessRating,
          response_quality_rating: feedback.responseQualityRating,
          empathy_rating: feedback.empathyRating,
          overall_rating: feedback.overallRating,
          session_completion_rating: feedback.sessionCompletionRating,
          feedback_text: feedback.feedbackText,
          is_anonymous: feedback.isAnonymous,
          metadata: feedback.metadata || {}
        });

      if (error) {
        console.error('Error submitting feedback:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }
  }

  static async getCounselorFeedback(counselorId: string, limit = 50): Promise<CounselorFeedback[]> {
    const supabase = getSupabaseServer();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('counselor_feedback')
      .select('*')
      .eq('counselor_id', counselorId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching counselor feedback:', error);
      return [];
    }

    return data;
  }

  static async updateCounselorStats(counselorId: string, periodStart: string, periodEnd: string) {
    const supabase = getSupabaseServer();
    if (!supabase) return;

    try {
      // Calculate stats for the period
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id,
          status,
          created_at,
          messages!inner(sender_id, created_at)
        `)
        .eq('counselor_id', counselorId)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd);

      if (sessionsError) {
        console.error('Error fetching sessions for stats:', sessionsError);
        return;
      }

      const stats = {
        counselor_id: counselorId,
        period_start: periodStart,
        period_end: periodEnd,
        sessions_handled: sessions?.length || 0,
        sessions_completed: sessions?.filter(s => s.status === 'ended').length || 0,
        sessions_abandoned: sessions?.filter(s => s.status === 'active' && new Date(s.created_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)).length || 0,
        messages_sent: sessions?.reduce((sum, s) => sum + (s.messages?.filter(m => m.sender_id === counselorId).length || 0), 0) || 0,
        messages_received: sessions?.reduce((sum, s) => sum + (s.messages?.filter(m => m.sender_id !== counselorId).length || 0), 0) || 0,
        // Additional calculations would go here for response times, etc.
      };

      await supabase
        .from('counselor_stats')
        .upsert(stats, {
          onConflict: 'counselor_id,period_start,period_end'
        });

    } catch (error) {
      console.error('Error updating counselor stats:', error);
    }
  }

  static async getAvailableCounselorsWithReputation(): Promise<Array<{ id: string; reputation: CounselorReputation | null }>> {
    const supabase = getSupabaseServer();
    if (!supabase) return [];

    try {
      const { data: counselors, error } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'counselor')
        .eq('is_active', true);

      if (error || !counselors) return [];

      const counselorsWithReputation = await Promise.all(
        counselors.map(async (counselor) => ({
          id: counselor.id,
          reputation: await this.calculateCounselorReputation(counselor.id)
        }))
      );

      return counselorsWithReputation.sort((a, b) =>
        (b.reputation?.reputationScore || 0) - (a.reputation?.reputationScore || 0)
      );
    } catch (error) {
      console.error('Error getting counselors with reputation:', error);
      return [];
    }
  }
}
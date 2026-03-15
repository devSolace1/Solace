import { createClient } from '@supabase/supabase-js';
import type { EmotionEntry, MoodCheckIn, EmotionalTrend, RecoveryInsight, CopingStrategy, JournalEntry } from '../types';

export class EmotionService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Create a mood check-in
   */
  async createMoodCheckIn(
    userId: string,
    overallMood: number,
    emotions: Omit<EmotionEntry, 'id' | 'user_id' | 'created_at'>[],
    energyLevel: number,
    sleepQuality: number,
    stressLevel: number,
    notes?: string
  ): Promise<MoodCheckIn> {
    // Start a transaction
    const { data: checkIn, error: checkInError } = await this.supabase
      .from('mood_checkins_v5')
      .insert({
        user_id: userId,
        overall_mood: overallMood,
        energy_level: energyLevel,
        sleep_quality: sleepQuality,
        stress_level: stressLevel,
        notes
      })
      .select()
      .single();

    if (checkInError) throw checkInError;

    // Insert emotions
    if (emotions.length > 0) {
      const emotionInserts = emotions.map(emotion => ({
        user_id: userId,
        checkin_id: checkIn.id,
        emotion_type: emotion.emotion_type,
        intensity: emotion.intensity,
        context: emotion.context,
        triggers: emotion.triggers,
        coping_strategies: emotion.coping_strategies
      }));

      const { error: emotionError } = await this.supabase
        .from('emotion_entries_v5')
        .insert(emotionInserts);

      if (emotionError) throw emotionError;
    }

    return {
      ...checkIn,
      emotions: emotions.map((emotion, index) => ({
        ...emotion,
        id: `temp_${index}`,
        user_id: userId,
        created_at: new Date().toISOString()
      }))
    };
  }

  /**
   * Get user's mood history
   */
  async getMoodHistory(userId: string, limit: number = 30): Promise<MoodCheckIn[]> {
    const { data: checkIns, error } = await this.supabase
      .from('mood_checkins_v5')
      .select(`
        *,
        emotion_entries_v5 (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (checkIns || []).map(checkIn => ({
      ...checkIn,
      emotions: checkIn.emotion_entries_v5 || []
    }));
  }

  /**
   * Get emotional trends
   */
  async getEmotionalTrends(userId: string, days: number = 30): Promise<EmotionalTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: trends, error } = await this.supabase
      .rpc('get_emotional_trends', {
        user_id: userId,
        start_date: startDate.toISOString(),
        days
      });

    if (error) throw error;
    return trends || [];
  }

  /**
   * Generate recovery insights
   */
  async getRecoveryInsights(userId: string, period: 'week' | 'month' = 'week'): Promise<RecoveryInsight> {
    const days = period === 'week' ? 7 : 30;
    const trends = await this.getEmotionalTrends(userId, days);

    if (trends.length < 2) {
      return {
        period,
        mood_improvement: 0,
        consistency_score: 0,
        top_emotions: [],
        recommended_actions: ['Keep tracking your mood daily'],
        risk_indicators: []
      };
    }

    const firstWeek = trends.slice(0, 7);
    const lastWeek = trends.slice(-7);

    const firstAvg = firstWeek.reduce((sum, t) => sum + t.average_mood, 0) / firstWeek.length;
    const lastAvg = lastWeek.reduce((sum, t) => sum + t.average_mood, 0) / lastWeek.length;
    const moodImprovement = lastAvg - firstAvg;

    const consistencyScore = trends.filter(t => t.entry_count > 0).length / trends.length;

    const allEmotions = trends.flatMap(t => t.dominant_emotion ? [t.dominant_emotion] : []);
    const emotionCounts = allEmotions.reduce((acc, emotion) => {
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topEmotions = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([emotion]) => emotion);

    const recommendedActions = this.generateRecommendations(moodImprovement, consistencyScore, topEmotions);
    const riskIndicators = this.identifyRiskIndicators(trends);

    return {
      period,
      mood_improvement: moodImprovement,
      consistency_score: consistencyScore,
      top_emotions: topEmotions,
      recommended_actions: recommendedActions,
      risk_indicators: riskIndicators
    };
  }

  /**
   * Get coping strategies
   */
  async getCopingStrategies(category?: string, difficulty?: string): Promise<CopingStrategy[]> {
    let query = this.supabase
      .from('coping_strategies_v5')
      .select('*')
      .eq('is_active', true)
      .order('is_recommended', { ascending: false })
      .order('difficulty', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    const { data: strategies, error } = await query;
    if (error) throw error;
    return strategies || [];
  }

  /**
   * Create journal entry
   */
  async createJournalEntry(
    userId: string,
    title: string,
    content: string,
    moodBefore: number,
    emotions: string[],
    tags: string[],
    isPrivate: boolean = true
  ): Promise<JournalEntry> {
    const { data: entry, error } = await this.supabase
      .from('journal_entries_v5')
      .insert({
        user_id: userId,
        title,
        content,
        mood_before: moodBefore,
        emotions,
        tags,
        is_private: isPrivate
      })
      .select()
      .single();

    if (error) throw error;
    return entry;
  }

  /**
   * Get user's journal entries
   */
  async getJournalEntries(userId: string, limit: number = 20): Promise<JournalEntry[]> {
    const { data: entries, error } = await this.supabase
      .from('journal_entries_v5')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return entries || [];
  }

  /**
   * Update journal entry mood after
   */
  async updateJournalMoodAfter(entryId: string, moodAfter: number): Promise<void> {
    const { error } = await this.supabase
      .from('journal_entries_v5')
      .update({
        mood_after: moodAfter,
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId);

    if (error) throw error;
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(moodImprovement: number, consistencyScore: number, topEmotions: string[]): string[] {
    const recommendations: string[] = [];

    if (consistencyScore < 0.5) {
      recommendations.push('Try to check in daily for better insights');
    }

    if (moodImprovement < 0) {
      recommendations.push('Consider speaking with a counselor about recent changes');
      recommendations.push('Practice daily gratitude or mindfulness exercises');
    }

    if (topEmotions.includes('anxious') || topEmotions.includes('stressed')) {
      recommendations.push('Try breathing exercises or progressive muscle relaxation');
    }

    if (topEmotions.includes('sad') || topEmotions.includes('depressed')) {
      recommendations.push('Consider journaling your thoughts and feelings');
      recommendations.push('Reach out to supportive friends or family');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue your current self-care practices');
      recommendations.push('Consider exploring new coping strategies');
    }

    return recommendations;
  }

  /**
   * Identify risk indicators
   */
  private identifyRiskIndicators(trends: EmotionalTrend[]): string[] {
    const indicators: string[] = [];

    // Check for consistently low mood
    const lowMoodDays = trends.filter(t => t.average_mood < 3).length;
    if (lowMoodDays > trends.length * 0.7) {
      indicators.push('Consistently low mood - consider professional support');
    }

    // Check for high stress
    const highStressDays = trends.filter(t => t.stress_average > 7).length;
    if (highStressDays > trends.length * 0.5) {
      indicators.push('High stress levels - prioritize self-care');
    }

    // Check for low energy
    const lowEnergyDays = trends.filter(t => t.energy_average < 3).length;
    if (lowEnergyDays > trends.length * 0.6) {
      indicators.push('Low energy levels - ensure adequate rest and nutrition');
    }

    // Check for missed check-ins (potential crisis indicator)
    const recentTrends = trends.slice(-3);
    const missedDays = recentTrends.filter(t => t.entry_count === 0).length;
    if (missedDays >= 2) {
      indicators.push('Missed recent check-ins - reach out if you need support');
    }

    return indicators;
  }
}
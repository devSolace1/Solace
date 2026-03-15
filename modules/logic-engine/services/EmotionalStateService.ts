'use client';

import { createClient } from '@supabase/supabase-js';
import type {
  EmotionalState,
  EmotionalStateModel,
  RiskLevel,
  ConversationPattern
} from '../types/types';

export class EmotionalStateService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Calculate emotional state for a user based on multiple signals
   */
  async calculateEmotionalState(userId: string): Promise<EmotionalStateModel> {
    const signals = await this.gatherEmotionalSignals(userId);
    const trends = await this.analyzeTrends(userId);
    const state = this.determineEmotionalState(signals, trends);

    return {
      userId,
      currentState: state,
      confidence: this.calculateConfidence(signals),
      signals,
      trends,
      lastUpdated: new Date()
    };
  }

  /**
   * Gather all emotional signals for a user
   */
  private async gatherEmotionalSignals(userId: string): Promise<EmotionalStateModel['signals']> {
    const [
      moodData,
      messageData,
      sessionData,
      panicData
    ] = await Promise.all([
      this.getMoodData(userId),
      this.getMessageSentimentData(userId),
      this.getSessionData(userId),
      this.getPanicData(userId)
    ]);

    return {
      dailyMoodScore: moodData.averageMood,
      messageSentimentTrend: messageData.sentimentTrend,
      chatFrequency: messageData.frequency,
      panicEvents: panicData.count,
      conversationDuration: sessionData.averageDuration,
      sessionStreak: sessionData.streak,
      lastMoodCheck: moodData.lastCheck
    };
  }

  /**
   * Analyze emotional trends over time
   */
  private async analyzeTrends(userId: string): Promise<EmotionalStateModel['trends']> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get mood trend
    const { data: moodLogs } = await this.supabase
      .from('mood_logs')
      .select('mood, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    const moodImprovement = this.calculateMoodImprovement(moodLogs || []);

    // Get activity trend
    const { data: sessions } = await this.supabase
      .from('sessions')
      .select('created_at')
      .eq('participant_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const activityIncrease = this.calculateActivityIncrease(sessions || []);

    // Risk indicators
    const riskIndicators = await this.identifyRiskIndicators(userId);

    return {
      moodImprovement,
      activityIncrease,
      riskIndicators
    };
  }

  /**
   * Determine emotional state based on signals and trends
   */
  private determineEmotionalState(
    signals: EmotionalStateModel['signals'],
    trends: EmotionalStateModel['trends']
  ): EmotionalState {
    let score = 0;

    // Mood score (0-10, higher is better)
    score += (signals.dailyMoodScore / 10) * 30;

    // Sentiment trend (-1 to 1, positive is better)
    score += ((signals.messageSentimentTrend + 1) / 2) * 20;

    // Panic events (fewer is better)
    const panicPenalty = Math.min(signals.panicEvents * 10, 20);
    score -= panicPenalty;

    // Session streak (more consistent is better)
    score += Math.min(signals.sessionStreak * 2, 10);

    // Trends
    score += trends.moodImprovement > 0 ? 10 : -10;
    score += trends.activityIncrease > 0 ? 5 : -5;

    // Risk indicators penalty
    score -= trends.riskIndicators.length * 5;

    // Normalize to 0-100
    score = Math.max(0, Math.min(100, score));

    if (score >= 70) return 'stable';
    if (score >= 50) return 'recovering';
    if (score >= 30) return 'distressed';
    return 'high_risk';
  }

  /**
   * Calculate confidence in the emotional state assessment
   */
  private calculateConfidence(signals: EmotionalStateModel['signals']): number {
    let confidence = 0;
    let factors = 0;

    if (signals.lastMoodCheck) {
      const daysSinceMoodCheck = (Date.now() - signals.lastMoodCheck.getTime()) / (1000 * 60 * 60 * 24);
      confidence += Math.max(0, 1 - daysSinceMoodCheck / 7); // Full confidence for recent checks
      factors++;
    }

    if (signals.sessionStreak > 0) {
      confidence += Math.min(signals.sessionStreak / 10, 1); // More sessions = more confidence
      factors++;
    }

    confidence += Math.min(signals.chatFrequency / 5, 1); // More activity = more confidence
    factors++;

    return factors > 0 ? confidence / factors : 0;
  }

  // Helper methods for data gathering
  private async getMoodData(userId: string): Promise<{ averageMood: number; lastCheck: Date | null }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data } = await this.supabase
      .from('mood_logs')
      .select('mood, created_at')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) {
      return { averageMood: 5, lastCheck: null }; // Neutral default
    }

    const moodValues = data.map(log => this.moodStringToNumber(log.mood));
    const averageMood = moodValues.reduce((sum, mood) => sum + mood, 0) / moodValues.length;

    return {
      averageMood,
      lastCheck: new Date(data[0].created_at)
    };
  }

  private async getMessageSentimentData(userId: string): Promise<{ sentimentTrend: number; frequency: number }> {
    // Simplified sentiment analysis - in production, use NLP service
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: messages } = await this.supabase
      .from('messages')
      .select('content, created_at, session_id')
      .eq('sender_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (!messages || messages.length === 0) {
      return { sentimentTrend: 0, frequency: 0 };
    }

    // Simple sentiment analysis based on keywords
    const positiveWords = ['thank', 'better', 'good', 'hope', 'grateful', 'okay'];
    const negativeWords = ['sad', 'hurt', 'pain', 'angry', 'worst', 'hate', 'depressed'];

    let positiveCount = 0;
    let negativeCount = 0;

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      positiveWords.forEach(word => {
        if (content.includes(word)) positiveCount++;
      });
      negativeWords.forEach(word => {
        if (content.includes(word)) negativeCount++;
      });
    });

    const totalSentimentWords = positiveCount + negativeCount;
    const sentimentTrend = totalSentimentWords > 0
      ? (positiveCount - negativeCount) / totalSentimentWords
      : 0;

    const frequency = messages.length / 30; // messages per day

    return { sentimentTrend, frequency };
  }

  private async getSessionData(userId: string): Promise<{ averageDuration: number; streak: number }> {
    const { data: sessions } = await this.supabase
      .from('sessions')
      .select('created_at, ended_at, status')
      .eq('participant_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!sessions || sessions.length === 0) {
      return { averageDuration: 0, streak: 0 };
    }

    // Calculate average duration
    const completedSessions = sessions.filter(s => s.ended_at);
    const averageDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => {
          const duration = (new Date(s.ended_at!).getTime() - new Date(s.created_at).getTime()) / (1000 * 60);
          return sum + duration;
        }, 0) / completedSessions.length
      : 0;

    // Calculate session streak (consecutive days with sessions)
    const streak = this.calculateSessionStreak(sessions);

    return { averageDuration, streak };
  }

  private async getPanicData(userId: string): Promise<{ count: number }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count } = await this.supabase
      .from('panic_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    return { count: count || 0 };
  }

  private calculateMoodImprovement(moodLogs: any[]): number {
    if (moodLogs.length < 2) return 0;

    const firstHalf = moodLogs.slice(0, Math.floor(moodLogs.length / 2));
    const secondHalf = moodLogs.slice(Math.floor(moodLogs.length / 2));

    const firstAvg = firstHalf.reduce((sum, log) => sum + this.moodStringToNumber(log.mood), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, log) => sum + this.moodStringToNumber(log.mood), 0) / secondHalf.length;

    return ((secondAvg - firstAvg) / firstAvg) * 100;
  }

  private calculateActivityIncrease(sessions: any[]): number {
    if (sessions.length < 2) return 0;

    const midPoint = Math.floor(sessions.length / 2);
    const firstHalf = sessions.slice(0, midPoint);
    const secondHalf = sessions.slice(midPoint);

    const firstPeriodDays = firstHalf.length > 1
      ? (new Date(firstHalf[0].created_at).getTime() - new Date(firstHalf[firstHalf.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24)
      : 15;

    const secondPeriodDays = secondHalf.length > 1
      ? (new Date(secondHalf[0].created_at).getTime() - new Date(secondHalf[secondHalf.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24)
      : 15;

    const firstRate = firstHalf.length / Math.max(firstPeriodDays, 1);
    const secondRate = secondHalf.length / Math.max(secondPeriodDays, 1);

    return firstRate > 0 ? ((secondRate - firstRate) / firstRate) * 100 : 0;
  }

  private async identifyRiskIndicators(userId: string): Promise<string[]> {
    const indicators: string[] = [];

    // Check for frequent panic alerts
    const { count: panicCount } = await this.supabase
      .from('panic_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (panicCount && panicCount > 0) {
      indicators.push('active_panic_alert');
    }

    // Check for very low mood scores
    const { data: recentMood } = await this.supabase
      .from('mood_logs')
      .select('mood')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentMood && recentMood.length > 0) {
      const moodValue = this.moodStringToNumber(recentMood[0].mood);
      if (moodValue <= 2) {
        indicators.push('very_low_mood');
      }
    }

    // Check for isolation (no sessions in 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentSessions } = await this.supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('participant_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (!recentSessions || recentSessions === 0) {
      indicators.push('isolation_risk');
    }

    return indicators;
  }

  private calculateSessionStreak(sessions: any[]): number {
    if (sessions.length === 0) return 0;

    const sortedSessions = sessions
      .filter(s => s.status === 'ended')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    let streak = 0;
    let currentDate = new Date();

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.created_at).toDateString();

      if (sessionDate === currentDate.toDateString()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (sessionDate === new Date(currentDate.getTime() - 24 * 60 * 60 * 1000).toDateString()) {
        // Previous day
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break; // Streak broken
      }
    }

    return streak;
  }

  private moodStringToNumber(mood: string): number {
    const moodMap: Record<string, number> = {
      'very_bad': 1,
      'bad': 2,
      'neutral': 3,
      'good': 4,
      'very_good': 5,
      'excellent': 6
    };
    return moodMap[mood] || 3;
  }
}
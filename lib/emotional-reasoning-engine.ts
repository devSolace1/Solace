// V8 Emotional Reasoning Engine
// Lightweight emotional state classification system

import { db } from '../database/adapter';
import { configManager } from '../config/manager';

export type EmotionalState = 'stable' | 'recovering' | 'distressed' | 'high_risk';

export interface EmotionalSignals {
  userId: string;
  moodScore?: number; // 1-10 scale
  chatSentiment?: number; // -1 to 1 scale
  panicUsage: number; // count in last 30 days
  conversationLength: number; // average minutes
  sessionFrequency: number; // sessions per week
  lastActivity: string; // ISO timestamp
}

export interface EmotionalProfile {
  userId: string;
  currentState: EmotionalState;
  confidence: number; // 0-1
  lastUpdated: string;
  signals: EmotionalSignals;
  recoveryScore: number; // 0-100
  stabilityTrend: 'improving' | 'stable' | 'declining';
}

export class EmotionalReasoningEngine {
  private static readonly STATE_THRESHOLDS = {
    stable: { minScore: 70, maxPanic: 0, maxFrequency: 2 },
    recovering: { minScore: 50, maxPanic: 2, maxFrequency: 5 },
    distressed: { minScore: 30, maxPanic: 5, maxFrequency: 10 },
    high_risk: { minScore: 0, maxPanic: 10, maxFrequency: 20 }
  };

  private static readonly SIGNAL_WEIGHTS = {
    moodScore: 0.3,
    chatSentiment: 0.25,
    panicUsage: 0.2,
    conversationLength: 0.15,
    sessionFrequency: 0.1
  };

  static async analyzeUser(userId: string): Promise<EmotionalProfile> {
    const signals = await this.collectSignals(userId);
    const state = this.classifyState(signals);
    const confidence = this.calculateConfidence(signals);
    const recoveryScore = this.calculateRecoveryScore(signals);
    const stabilityTrend = await this.calculateStabilityTrend(userId);

    const profile: EmotionalProfile = {
      userId,
      currentState: state,
      confidence,
      lastUpdated: new Date().toISOString(),
      signals,
      recoveryScore,
      stabilityTrend
    };

    // Store in database
    await this.storeProfile(profile);

    return profile;
  }

  private static async collectSignals(userId: string): Promise<EmotionalSignals> {
    const adapter = db.getAdapter();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get mood scores
    const moodResult = await adapter.query(
      'SELECT AVG(score) as avg_mood FROM mood_logs WHERE user_id = ? AND created_at >= ?',
      [userId, thirtyDaysAgo]
    );
    const moodScore = moodResult[0]?.avg_mood || 5;

    // Get chat sentiment (simplified - would need NLP in real implementation)
    const chatResult = await adapter.query(
      'SELECT COUNT(*) as message_count FROM messages WHERE sender_id = ? AND created_at >= ?',
      [userId, thirtyDaysAgo]
    );
    const chatSentiment = Math.min(chatResult[0]?.message_count / 50, 1) * 0.5; // Simplified

    // Get panic usage
    const panicResult = await adapter.query(
      'SELECT COUNT(*) as panic_count FROM panic_alerts WHERE user_id = ? AND created_at >= ?',
      [userId, thirtyDaysAgo]
    );
    const panicUsage = panicResult[0]?.panic_count || 0;

    // Get conversation metrics
    const sessionResult = await adapter.query(
      'SELECT AVG(EXTRACT(EPOCH FROM (ended_at - started_at))/60) as avg_length, COUNT(*) as session_count FROM sessions WHERE participant_id = ? AND started_at >= ?',
      [userId, thirtyDaysAgo]
    );
    const conversationLength = sessionResult[0]?.avg_length || 0;
    const sessionFrequency = (sessionResult[0]?.session_count || 0) / 4.3; // per week

    // Get last activity
    const activityResult = await adapter.query(
      'SELECT MAX(created_at) as last_activity FROM user_activity WHERE user_id = ?',
      [userId]
    );
    const lastActivity = activityResult[0]?.last_activity || new Date().toISOString();

    return {
      userId,
      moodScore,
      chatSentiment,
      panicUsage,
      conversationLength,
      sessionFrequency,
      lastActivity
    };
  }

  private static classifyState(signals: EmotionalSignals): EmotionalState {
    const score = this.calculateCompositeScore(signals);

    if (score >= 70 && signals.panicUsage <= 0 && signals.sessionFrequency <= 2) {
      return 'stable';
    } else if (score >= 50 && signals.panicUsage <= 2 && signals.sessionFrequency <= 5) {
      return 'recovering';
    } else if (score >= 30 && signals.panicUsage <= 5 && signals.sessionFrequency <= 10) {
      return 'distressed';
    } else {
      return 'high_risk';
    }
  }

  private static calculateCompositeScore(signals: EmotionalSignals): number {
    const normalizedMood = (signals.moodScore / 10) * 100;
    const normalizedSentiment = ((signals.chatSentiment + 1) / 2) * 100;
    const panicPenalty = Math.min(signals.panicUsage * 10, 50);
    const lengthBonus = Math.min(signals.conversationLength / 10, 20);
    const frequencyPenalty = Math.min(signals.sessionFrequency * 5, 30);

    return Math.max(0, Math.min(100,
      normalizedMood * this.SIGNAL_WEIGHTS.moodScore +
      normalizedSentiment * this.SIGNAL_WEIGHTS.chatSentiment -
      panicPenalty * this.SIGNAL_WEIGHTS.panicUsage +
      lengthBonus * this.SIGNAL_WEIGHTS.conversationLength -
      frequencyPenalty * this.SIGNAL_WEIGHTS.sessionFrequency
    ));
  }

  private static calculateConfidence(signals: EmotionalSignals): number {
    // Confidence based on data completeness and recency
    const dataPoints = Object.values(signals).filter(v => v !== undefined && v !== null).length;
    const recencyDays = (Date.now() - new Date(signals.lastActivity).getTime()) / (24 * 60 * 60 * 1000);

    return Math.min(1, (dataPoints / 6) * Math.max(0.3, 1 - recencyDays / 30));
  }

  private static calculateRecoveryScore(signals: EmotionalSignals): number {
    // Recovery score based on positive indicators
    const moodContribution = (signals.moodScore / 10) * 40;
    const sentimentContribution = ((signals.chatSentiment + 1) / 2) * 30;
    const activityBonus = Math.min(signals.sessionFrequency * 10, 30);

    return Math.min(100, moodContribution + sentimentContribution + activityBonus);
  }

  private static async calculateStabilityTrend(userId: string): Promise<'improving' | 'stable' | 'declining'> {
    const adapter = db.getAdapter();

    // Get historical profiles
    const historyResult = await adapter.query(
      'SELECT recovery_score FROM emotional_profiles WHERE user_id = ? ORDER BY last_updated DESC LIMIT 7',
      [userId]
    );

    if (historyResult.length < 2) return 'stable';

    const scores = historyResult.map((row: any) => row.recovery_score);
    const recent = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const older = scores.slice(3).reduce((a, b) => a + b, 0) / Math.max(1, scores.slice(3).length);

    const change = recent - older;

    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  }

  private static async storeProfile(profile: EmotionalProfile): Promise<void> {
    const adapter = db.getAdapter();

    await adapter.query(
      `INSERT INTO emotional_profiles (user_id, current_state, confidence, last_updated, signals, recovery_score, stability_trend)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         current_state = EXCLUDED.current_state,
         confidence = EXCLUDED.confidence,
         last_updated = EXCLUDED.last_updated,
         signals = EXCLUDED.signals,
         recovery_score = EXCLUDED.recovery_score,
         stability_trend = EXCLUDED.stability_trend`,
      [
        profile.userId,
        profile.currentState,
        profile.confidence,
        profile.lastUpdated,
        JSON.stringify(profile.signals),
        profile.recoveryScore,
        profile.stabilityTrend
      ]
    );
  }

  static async getUserProfile(userId: string): Promise<EmotionalProfile | null> {
    const adapter = db.getAdapter();

    const result = await adapter.query(
      'SELECT * FROM emotional_profiles WHERE user_id = ?',
      [userId]
    );

    if (result.length === 0) return null;

    const row = result[0];
    return {
      userId: row.user_id,
      currentState: row.current_state,
      confidence: row.confidence,
      lastUpdated: row.last_updated,
      signals: JSON.parse(row.signals),
      recoveryScore: row.recovery_score,
      stabilityTrend: row.stability_trend
    };
  }
}
// V8 Emotional Recovery Tracking
// Progress indicators and recovery metrics for user dashboard

import { db } from '../database/adapter';
import { EmotionalReasoningEngine, EmotionalProfile } from './emotional-reasoning-engine';

export interface RecoveryMetrics {
  userId: string;
  recoveryScore: number; // 0-100
  stabilityTrend: 'improving' | 'stable' | 'declining';
  activityFrequency: number; // sessions per week
  emotionalStability: number; // 0-100
  supportUtilization: number; // 0-100
  lastUpdated: string;
}

export interface RecoveryMilestone {
  id: string;
  userId: string;
  milestone: string;
  description: string;
  achievedAt: string;
  category: 'engagement' | 'emotional' | 'social' | 'cognitive';
}

export interface WeeklyProgress {
  weekStart: string;
  moodAverage: number;
  sessionCount: number;
  supportRoomParticipation: number;
  aiInteractions: number;
  counselorSessions: number;
  overallProgress: number; // -100 to 100
}

export class RecoveryTracker {
  private static readonly MILESTONES = {
    engagement: [
      { threshold: 1, milestone: 'First Session', description: 'Completed your first counseling session' },
      { threshold: 5, milestone: 'Regular Support', description: 'Attended 5 sessions' },
      { threshold: 10, milestone: 'Committed Journey', description: 'Completed 10 sessions' },
      { threshold: 25, milestone: 'Dedicated Seeker', description: 'Completed 25 sessions' }
    ],
    emotional: [
      { threshold: 70, milestone: 'Emotional Awareness', description: 'Achieved stable emotional state' },
      { threshold: 80, milestone: 'Progress Made', description: 'Showing consistent improvement' },
      { threshold: 90, milestone: 'Strong Recovery', description: 'Demonstrating significant emotional growth' }
    ],
    social: [
      { threshold: 1, milestone: 'Community Member', description: 'Joined your first support room' },
      { threshold: 5, milestone: 'Active Participant', description: 'Participated in 5 support room discussions' },
      { threshold: 10, milestone: 'Community Supporter', description: 'Helped others in support rooms' }
    ]
  };

  static async getRecoveryMetrics(userId: string): Promise<RecoveryMetrics> {
    const profile = await EmotionalReasoningEngine.getUserProfile(userId);
    const activityMetrics = await this.calculateActivityMetrics(userId);
    const stabilityMetrics = await this.calculateStabilityMetrics(userId);

    const recoveryScore = this.calculateRecoveryScore(profile, activityMetrics, stabilityMetrics);
    const stabilityTrend = profile?.stabilityTrend || 'stable';
    const activityFrequency = activityMetrics.sessionsPerWeek;
    const emotionalStability = stabilityMetrics.stabilityScore;
    const supportUtilization = activityMetrics.supportUtilization;

    return {
      userId,
      recoveryScore,
      stabilityTrend,
      activityFrequency,
      emotionalStability,
      supportUtilization,
      lastUpdated: new Date().toISOString()
    };
  }

  private static async calculateActivityMetrics(userId: string): Promise<{
    sessionsPerWeek: number;
    supportUtilization: number;
    totalSessions: number;
  }> {
    const adapter = db.getAdapter();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get session count
    const sessionResult = await adapter.query(
      'SELECT COUNT(*) as session_count FROM sessions WHERE participant_id = ? AND started_at >= ?',
      [userId, thirtyDaysAgo]
    );
    const totalSessions = sessionResult[0]?.session_count || 0;
    const sessionsPerWeek = totalSessions / 4.3; // Approximate weeks in 30 days

    // Calculate support utilization (combination of sessions, rooms, AI interactions)
    const roomResult = await adapter.query(
      'SELECT COUNT(DISTINCT room_id) as rooms_joined FROM room_memberships WHERE user_id = ? AND joined_at >= ?',
      [userId, thirtyDaysAgo]
    );
    const roomsJoined = roomResult[0]?.rooms_joined || 0;

    // Simplified AI interaction count (would need actual logging)
    const aiInteractions = Math.floor(totalSessions * 0.3); // Estimate

    const supportUtilization = Math.min(100,
      (totalSessions * 20) + (roomsJoined * 10) + (aiInteractions * 5)
    );

    return {
      sessionsPerWeek,
      supportUtilization,
      totalSessions
    };
  }

  private static async calculateStabilityMetrics(userId: string): Promise<{
    stabilityScore: number;
    moodVariance: number;
  }> {
    const adapter = db.getAdapter();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Get mood scores over time
    const moodResult = await adapter.query(
      'SELECT score FROM mood_logs WHERE user_id = ? AND created_at >= ? ORDER BY created_at',
      [userId, ninetyDaysAgo]
    );

    if (moodResult.length < 2) {
      return { stabilityScore: 50, moodVariance: 0 };
    }

    const scores = moodResult.map((row: any) => row.score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - average, 2), 0) / scores.length;
    const moodVariance = Math.sqrt(variance);

    // Lower variance = higher stability
    const stabilityScore = Math.max(0, Math.min(100, 100 - (moodVariance * 10)));

    return { stabilityScore, moodVariance };
  }

  private static calculateRecoveryScore(
    profile: EmotionalProfile | null,
    activity: any,
    stability: any
  ): number {
    if (!profile) return 0;

    const emotionalWeight = 0.4;
    const activityWeight = 0.3;
    const stabilityWeight = 0.3;

    const emotionalScore = profile.recoveryScore;
    const activityScore = Math.min(100, activity.supportUtilization);
    const stabilityScore = stability.stabilityScore;

    return Math.round(
      emotionalScore * emotionalWeight +
      activityScore * activityWeight +
      stabilityScore * stabilityWeight
    );
  }

  static async getWeeklyProgress(userId: string, weeks: number = 4): Promise<WeeklyProgress[]> {
    const adapter = db.getAdapter();
    const progress: WeeklyProgress[] = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Get mood average for the week
      const moodResult = await adapter.query(
        'SELECT AVG(score) as avg_mood FROM mood_logs WHERE user_id = ? AND created_at >= ? AND created_at < ?',
        [userId, weekStart.toISOString(), weekEnd.toISOString()]
      );
      const moodAverage = moodResult[0]?.avg_mood || 0;

      // Get session count
      const sessionResult = await adapter.query(
        'SELECT COUNT(*) as session_count FROM sessions WHERE participant_id = ? AND started_at >= ? AND started_at < ?',
        [userId, weekStart.toISOString(), weekEnd.toISOString()]
      );
      const sessionCount = sessionResult[0]?.session_count || 0;

      // Get support room participation
      const roomResult = await adapter.query(
        'SELECT COUNT(*) as message_count FROM room_messages WHERE user_id = ? AND timestamp >= ? AND timestamp < ?',
        [userId, weekStart.toISOString(), weekEnd.toISOString()]
      );
      const supportRoomParticipation = roomResult[0]?.message_count || 0;

      // Estimate AI interactions (would need actual logging)
      const aiInteractions = Math.floor(sessionCount * 0.3);

      // Count counselor sessions
      const counselorResult = await adapter.query(
        'SELECT COUNT(*) as counselor_sessions FROM sessions WHERE participant_id = ? AND counselor_id IS NOT NULL AND started_at >= ? AND started_at < ?',
        [userId, weekStart.toISOString(), weekEnd.toISOString()]
      );
      const counselorSessions = counselorResult[0]?.counselor_sessions || 0;

      // Calculate overall progress (simplified)
      const overallProgress = Math.min(100, Math.max(-100,
        (moodAverage - 5) * 10 + // Mood above neutral is positive
        sessionCount * 5 + // More sessions is positive
        supportRoomParticipation * 2 // Community engagement is positive
      ));

      progress.push({
        weekStart: weekStart.toISOString(),
        moodAverage,
        sessionCount,
        supportRoomParticipation,
        aiInteractions,
        counselorSessions,
        overallProgress
      });
    }

    return progress;
  }

  static async checkMilestones(userId: string): Promise<RecoveryMilestone[]> {
    const adapter = db.getAdapter();
    const metrics = await this.getRecoveryMetrics(userId);
    const activityMetrics = await this.calculateActivityMetrics(userId);

    const milestones: RecoveryMilestone[] = [];

    // Check engagement milestones
    for (const milestone of this.MILESTONES.engagement) {
      if (activityMetrics.totalSessions >= milestone.threshold) {
        const existing = await adapter.query(
          'SELECT * FROM recovery_milestones WHERE user_id = ? AND milestone = ?',
          [userId, milestone.milestone]
        );

        if (existing.length === 0) {
          const newMilestone: RecoveryMilestone = {
            id: this.generateMilestoneId(),
            userId,
            milestone: milestone.milestone,
            description: milestone.description,
            achievedAt: new Date().toISOString(),
            category: 'engagement'
          };

          milestones.push(newMilestone);

          // Store in database
          await adapter.query(`
            INSERT INTO recovery_milestones (id, user_id, milestone, description, achieved_at, category)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            newMilestone.id,
            newMilestone.userId,
            newMilestone.milestone,
            newMilestone.description,
            newMilestone.achievedAt,
            newMilestone.category
          ]);
        }
      }
    }

    // Check emotional milestones
    for (const milestone of this.MILESTONES.emotional) {
      if (metrics.recoveryScore >= milestone.threshold) {
        const existing = await adapter.query(
          'SELECT * FROM recovery_milestones WHERE user_id = ? AND milestone = ?',
          [userId, milestone.milestone]
        );

        if (existing.length === 0) {
          const newMilestone: RecoveryMilestone = {
            id: this.generateMilestoneId(),
            userId,
            milestone: milestone.milestone,
            description: milestone.description,
            achievedAt: new Date().toISOString(),
            category: 'emotional'
          };

          milestones.push(newMilestone);

          await adapter.query(`
            INSERT INTO recovery_milestones (id, user_id, milestone, description, achieved_at, category)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            newMilestone.id,
            newMilestone.userId,
            newMilestone.milestone,
            newMilestone.description,
            newMilestone.achievedAt,
            newMilestone.category
          ]);
        }
      }
    }

    return milestones;
  }

  static async getUserMilestones(userId: string): Promise<RecoveryMilestone[]> {
    const adapter = db.getAdapter();

    const result = await adapter.query(
      'SELECT * FROM recovery_milestones WHERE user_id = ? ORDER BY achieved_at DESC',
      [userId]
    );

    return result.map(row => ({
      id: row.id,
      userId: row.user_id,
      milestone: row.milestone,
      description: row.description,
      achievedAt: row.achieved_at,
      category: row.category
    }));
  }

  private static generateMilestoneId(): string {
    return `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static async getProgressInsights(userId: string): Promise<{
    strengths: string[];
    areasForGrowth: string[];
    recommendations: string[];
  }> {
    const metrics = await this.getRecoveryMetrics(userId);
    const weeklyProgress = await this.getWeeklyProgress(userId, 4);

    const strengths: string[] = [];
    const areasForGrowth: string[] = [];
    const recommendations: string[] = [];

    // Analyze strengths
    if (metrics.recoveryScore > 70) {
      strengths.push('Strong overall recovery progress');
    }
    if (metrics.activityFrequency > 2) {
      strengths.push('Consistent engagement with support services');
    }
    if (metrics.emotionalStability > 70) {
      strengths.push('Good emotional stability');
    }
    if (metrics.supportUtilization > 60) {
      strengths.push('Active utilization of available support');
    }

    // Analyze areas for growth
    if (metrics.recoveryScore < 50) {
      areasForGrowth.push('Recovery progress could be strengthened');
    }
    if (metrics.activityFrequency < 1) {
      areasForGrowth.push('More frequent support engagement may help');
    }
    if (metrics.emotionalStability < 50) {
      areasForGrowth.push('Emotional stability shows room for improvement');
    }

    // Generate recommendations
    if (metrics.stabilityTrend === 'declining') {
      recommendations.push('Consider increasing support session frequency');
    }
    if (metrics.supportUtilization < 40) {
      recommendations.push('Explore joining support community rooms');
    }
    if (weeklyProgress.length > 0 && weeklyProgress[0].moodAverage < 4) {
      recommendations.push('Daily mood tracking can help identify patterns');
    }

    return { strengths, areasForGrowth, recommendations };
  }
}
'use client';

import { createClient } from '@supabase/supabase-js';
import type {
  MatchingCriteria,
  CounselorMatch,
  CounselorLoad,
  EmotionalState,
  RiskLevel,
  SessionPriority
} from '../types/types';

export class CounselorMatchingService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Find the best counselor match for a user based on intelligent criteria
   */
  async findBestMatch(criteria: MatchingCriteria): Promise<CounselorMatch[]> {
    const availableCounselors = await this.getAvailableCounselors();

    if (availableCounselors.length === 0) {
      return [];
    }

    const matches = await Promise.all(
      availableCounselors.map(async (counselor) => {
        const score = await this.calculateMatchScore(counselor, criteria);
        const reasons = this.generateMatchReasons(counselor, criteria, score);

        return {
          counselorId: counselor.counselorId,
          score,
          reasons,
          availability: counselor.availability,
          specialization: counselor.specialization,
          currentLoad: counselor.activeSessions
        };
      })
    );

    // Sort by score (highest first) and return top matches
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  /**
   * Get all available counselors with their current load
   */
  private async getAvailableCounselors(): Promise<CounselorLoad[]> {
    // Get counselors who are online and available
    const { data: counselors } = await this.supabase
      .from('users')
      .select('id, metadata, last_seen_at')
      .eq('role', 'counselor')
      .eq('is_active', true);

    if (!counselors) return [];

    const counselorLoads = await Promise.all(
      counselors.map(async (counselor) => {
        const load = await this.calculateCounselorLoad(counselor.id);
        const availability = this.determineAvailability(counselor, load);

        return {
          counselorId: counselor.id,
          activeSessions: load.activeSessions,
          totalSessionsToday: load.totalSessionsToday,
          averageSessionDuration: load.averageSessionDuration,
          specialization: counselor.metadata?.specializations || [],
          availability,
          lastActive: new Date(counselor.last_seen_at)
        };
      })
    );

    return counselorLoads.filter(c => c.availability !== 'unavailable');
  }

  /**
   * Calculate comprehensive match score between counselor and user
   */
  private async calculateMatchScore(
    counselor: CounselorLoad,
    criteria: MatchingCriteria
  ): Promise<number> {
    let score = 0;
    let totalWeight = 0;

    // Availability weight (30%)
    const availabilityScore = this.scoreAvailability(counselor.availability);
    score += availabilityScore * 0.3;
    totalWeight += 0.3;

    // Workload balance weight (20%)
    const workloadScore = this.scoreWorkload(counselor);
    score += workloadScore * 0.2;
    totalWeight += 0.2;

    // Specialization match weight (25%)
    const specializationScore = this.scoreSpecialization(counselor, criteria);
    score += specializationScore * 0.25;
    totalWeight += 0.25;

    // Emotional state compatibility weight (15%)
    const emotionalScore = this.scoreEmotionalCompatibility(counselor, criteria);
    score += emotionalScore * 0.15;
    totalWeight += 0.15;

    // Historical performance weight (10%)
    const historyScore = await this.scoreHistoricalPerformance(counselor.counselorId, criteria);
    score += historyScore * 0.1;
    totalWeight += 0.1;

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Score counselor availability
   */
  private scoreAvailability(availability: CounselorLoad['availability']): number {
    switch (availability) {
      case 'available': return 1.0;
      case 'busy': return 0.6;
      case 'unavailable': return 0.0;
      case 'offline': return 0.0;
      default: return 0.5;
    }
  }

  /**
   * Score workload balance (prefer counselors with moderate load)
   */
  private scoreWorkload(counselor: CounselorLoad): number {
    const activeSessions = counselor.activeSessions;

    if (activeSessions === 0) return 0.8; // Slight preference for completely free
    if (activeSessions === 1) return 1.0; // Optimal load
    if (activeSessions === 2) return 0.9; // Still good
    if (activeSessions === 3) return 0.7; // Getting busy
    if (activeSessions >= 4) return 0.4; // Too busy

    return 0.5;
  }

  /**
   * Score specialization match
   */
  private scoreSpecialization(
    counselor: CounselorLoad,
    criteria: MatchingCriteria
  ): number {
    if (!criteria.preferredSpecializations || criteria.preferredSpecializations.length === 0) {
      return 0.7; // Neutral score when no preferences specified
    }

    const matches = criteria.preferredSpecializations.filter(spec =>
      counselor.specialization.includes(spec)
    );

    return matches.length > 0 ? 1.0 : 0.3;
  }

  /**
   * Score emotional state compatibility
   */
  private scoreEmotionalCompatibility(
    counselor: CounselorLoad,
    criteria: MatchingCriteria
  ): number {
    // High-risk users should get more experienced counselors
    if (criteria.riskLevel === 'critical' || criteria.emotionalState === 'high_risk') {
      // Prefer counselors with more sessions today (experience)
      return Math.min(counselor.totalSessionsToday / 10, 1.0);
    }

    // Stable users can work with any counselor
    if (criteria.emotionalState === 'stable') {
      return 0.8;
    }

    // Default compatibility
    return 0.7;
  }

  /**
   * Score based on historical performance with similar users
   */
  private async scoreHistoricalPerformance(
    counselorId: string,
    criteria: MatchingCriteria
  ): Promise<number> {
    // Check if this counselor has helped users with similar emotional states before
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: pastSessions } = await this.supabase
      .from('sessions')
      .select(`
        id,
        participant_id,
        ended_at,
        metadata
      `)
      .eq('counselor_id', counselorId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .not('ended_at', 'is', null);

    if (!pastSessions || pastSessions.length === 0) {
      return 0.5; // Neutral for new counselors
    }

    // In a real implementation, you'd have feedback/ratings data
    // For now, use session completion rate as a proxy
    const completedSessions = pastSessions.filter(s => s.ended_at);
    const completionRate = completedSessions.length / pastSessions.length;

    return completionRate;
  }

  /**
   * Determine counselor availability based on current status
   */
  private determineAvailability(
    counselor: any,
    load: { activeSessions: number }
  ): CounselorLoad['availability'] {
    const lastSeen = new Date(counselor.last_seen_at);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Check if counselor was active recently
    if (lastSeen < fiveMinutesAgo) {
      return 'offline';
    }

    // Check current session load
    if (load.activeSessions >= 4) {
      return 'unavailable';
    }

    if (load.activeSessions >= 2) {
      return 'busy';
    }

    return 'available';
  }

  /**
   * Calculate current load for a counselor
   */
  private async calculateCounselorLoad(counselorId: string): Promise<{
    activeSessions: number;
    totalSessionsToday: number;
    averageSessionDuration: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active sessions (not ended)
    const { count: activeSessions } = await this.supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('counselor_id', counselorId)
      .is('ended_at', null);

    // Sessions today
    const { count: totalSessionsToday } = await this.supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('counselor_id', counselorId)
      .gte('created_at', today.toISOString());

    // Average session duration (last 30 sessions)
    const { data: recentSessions } = await this.supabase
      .from('sessions')
      .select('created_at, ended_at')
      .eq('counselor_id', counselorId)
      .not('ended_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);

    let averageSessionDuration = 0;
    if (recentSessions && recentSessions.length > 0) {
      const durations = recentSessions.map(session => {
        const start = new Date(session.created_at);
        const end = new Date(session.ended_at!);
        return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
      });

      averageSessionDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    }

    return {
      activeSessions: activeSessions || 0,
      totalSessionsToday: totalSessionsToday || 0,
      averageSessionDuration
    };
  }

  /**
   * Generate human-readable reasons for the match score
   */
  private generateMatchReasons(
    counselor: CounselorLoad,
    criteria: MatchingCriteria,
    score: number
  ): string[] {
    const reasons: string[] = [];

    if (counselor.availability === 'available') {
      reasons.push('Counselor is currently available');
    }

    if (counselor.activeSessions <= 2) {
      reasons.push('Good current workload balance');
    }

    if (criteria.preferredSpecializations?.some(spec => counselor.specialization.includes(spec))) {
      reasons.push('Matches your preferred specializations');
    }

    if (criteria.riskLevel === 'high' || criteria.riskLevel === 'critical') {
      if (counselor.totalSessionsToday > 5) {
        reasons.push('Experienced with high-risk situations');
      }
    }

    if (score > 0.8) {
      reasons.push('Excellent overall match');
    } else if (score > 0.6) {
      reasons.push('Good match');
    } else {
      reasons.push('Acceptable match');
    }

    return reasons;
  }

  /**
   * Emergency matching for critical situations
   */
  async findEmergencyMatch(criteria: MatchingCriteria): Promise<CounselorMatch | null> {
    const matches = await this.findBestMatch(criteria);

    // For emergencies, take the best available match regardless of score
    if (matches.length > 0) {
      return matches[0];
    }

    // If no one is available, find anyone who's been active recently
    const { data: fallbackCounselors } = await this.supabase
      .from('users')
      .select('id')
      .eq('role', 'counselor')
      .eq('is_active', true)
      .order('last_seen_at', { ascending: false })
      .limit(1);

    if (fallbackCounselors && fallbackCounselors.length > 0) {
      return {
        counselorId: fallbackCounselors[0].id,
        score: 0.3, // Low score but available
        reasons: ['Emergency fallback - limited options available'],
        availability: 'busy',
        specialization: [],
        currentLoad: 999 // Unknown
      };
    }

    return null;
  }
}
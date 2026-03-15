// V8 Intelligent Counselor Routing System
// Advanced matching and routing algorithms

import { db } from '../database/adapter';
import { EmotionalReasoningEngine, EmotionalState } from './emotional-reasoning-engine';

export interface CounselorProfile {
  id: string;
  availability: boolean;
  specialization: string[]; // e.g., ['heartbreak', 'anxiety', 'grief']
  experience: number; // years
  currentLoad: number; // active sessions
  maxLoad: number;
  timezone: string; // e.g., 'America/New_York'
  rating: number; // 1-5
  languages: string[];
}

export interface RoutingRequest {
  userId: string;
  userTimezone: string;
  preferredLanguage: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  topic?: string;
}

export interface RoutingResult {
  counselorId: string | null;
  matchScore: number;
  reasoning: string[];
  alternatives: string[];
}

export class IntelligentCounselorRouter {
  private static readonly URGENCY_WEIGHTS = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };

  private static readonly TIMEZONE_COMPATIBILITY = {
    same: 1.0,
    adjacent: 0.8,
    nearby: 0.6,
    distant: 0.3
  };

  static async routeUser(request: RoutingRequest): Promise<RoutingResult> {
    const availableCounselors = await this.getAvailableCounselors();
    const userEmotionalState = await this.getUserEmotionalState(request.userId);

    if (availableCounselors.length === 0) {
      return {
        counselorId: null,
        matchScore: 0,
        reasoning: ['No counselors currently available'],
        alternatives: []
      };
    }

    const scoredCounselors = await Promise.all(
      availableCounselors.map(async (counselor) => ({
        counselor,
        score: await this.calculateMatchScore(counselor, request, userEmotionalState)
      }))
    );

    scoredCounselors.sort((a, b) => b.score.total - a.score.total);

    const bestMatch = scoredCounselors[0];
    const alternatives = scoredCounselors.slice(1, 4).map(s => s.counselor.id);

    return {
      counselorId: bestMatch.counselor.id,
      matchScore: bestMatch.score.total,
      reasoning: this.generateReasoning(bestMatch.score.components),
      alternatives
    };
  }

  private static async getAvailableCounselors(): Promise<CounselorProfile[]> {
    const adapter = db.getAdapter();
    const now = new Date();

    // Get counselors who are online and not at max capacity
    const result = await adapter.query(`
      SELECT
        u.id,
        c.availability,
        c.specialization,
        c.experience_years as experience,
        c.timezone,
        c.rating,
        c.languages,
        c.max_sessions as maxLoad,
        COUNT(s.id) as currentLoad
      FROM users u
      JOIN counselor_profiles c ON u.id = c.user_id
      LEFT JOIN sessions s ON u.id = s.counselor_id AND s.status = 'active'
      WHERE u.role = 'counselor'
        AND c.availability = true
        AND u.last_active > ?
      GROUP BY u.id, c.availability, c.specialization, c.experience_years, c.timezone, c.rating, c.languages, c.max_sessions
      HAVING COUNT(s.id) < c.max_sessions
    `, [new Date(now.getTime() - 5 * 60 * 1000).toISOString()]); // Active in last 5 minutes

    return result.rows.map(row => ({
      id: row.id,
      availability: row.availability,
      specialization: JSON.parse(row.specialization || '[]'),
      experience: row.experience,
      currentLoad: row.currentLoad,
      maxLoad: row.maxLoad,
      timezone: row.timezone,
      rating: row.rating,
      languages: row.languages ? JSON.parse(row.languages) : ['en']
    }));
  }

  private static async getUserEmotionalState(userId: string): Promise<EmotionalState> {
    const profile = await EmotionalReasoningEngine.getUserProfile(userId);
    return profile?.currentState || 'stable';
  }

  private static async calculateMatchScore(
    counselor: CounselorProfile,
    request: RoutingRequest,
    userState: EmotionalState
  ): Promise<{ total: number; components: Record<string, number> }> {
    const components = {
      availability: this.scoreAvailability(counselor),
      specialization: this.scoreSpecialization(counselor, request.topic),
      experience: this.scoreExperience(counselor, userState),
      load: this.scoreLoad(counselor),
      timezone: this.scoreTimezone(counselor.timezone, request.userTimezone),
      language: this.scoreLanguage(counselor, request.preferredLanguage),
      rating: this.scoreRating(counselor),
      compatibility: await this.scoreCompatibility(counselor.id, request.userId)
    };

    // Weight components based on urgency
    const weights = this.getWeightsForUrgency(request.urgency);

    const total = Object.entries(components).reduce(
      (sum, [key, score]) => sum + score * weights[key],
      0
    );

    return { total, components };
  }

  private static scoreAvailability(counselor: CounselorProfile): number {
    return counselor.availability ? 1.0 : 0.0;
  }

  private static scoreSpecialization(counselor: CounselorProfile, topic?: string): number {
    if (!topic) return 0.5; // Neutral if no topic specified

    const hasSpecialization = counselor.specialization.some(spec =>
      spec.toLowerCase().includes(topic.toLowerCase()) ||
      topic.toLowerCase().includes(spec.toLowerCase())
    );

    return hasSpecialization ? 1.0 : 0.3;
  }

  private static scoreExperience(counselor: CounselorProfile, userState: EmotionalState): number {
    const baseScore = Math.min(counselor.experience / 10, 1.0); // Max at 10 years

    // Boost for high-risk users
    const riskMultiplier = userState === 'high_risk' ? 1.5 :
                          userState === 'distressed' ? 1.2 : 1.0;

    return Math.min(baseScore * riskMultiplier, 1.0);
  }

  private static scoreLoad(counselor: CounselorProfile): number {
    const utilization = counselor.currentLoad / counselor.maxLoad;
    return 1.0 - utilization; // Higher score for lower utilization
  }

  private static scoreTimezone(counselorTz: string, userTz: string): number {
    if (counselorTz === userTz) return this.TIMEZONE_COMPATIBILITY.same;

    // Calculate timezone difference in hours
    const counselorOffset = this.getTimezoneOffset(counselorTz);
    const userOffset = this.getTimezoneOffset(userTz);
    const diff = Math.abs(counselorOffset - userOffset);

    if (diff <= 2) return this.TIMEZONE_COMPATIBILITY.adjacent;
    if (diff <= 6) return this.TIMEZONE_COMPATIBILITY.nearby;
    return this.TIMEZONE_COMPATIBILITY.distant;
  }

  private static scoreLanguage(counselor: CounselorProfile, preferredLanguage: string): number {
    return counselor.languages.includes(preferredLanguage) ? 1.0 : 0.5;
  }

  private static scoreRating(counselor: CounselorProfile): number {
    return counselor.rating / 5.0;
  }

  private static async scoreCompatibility(counselorId: string, userId: string): Promise<number> {
    const adapter = db.getAdapter();

    // Check past successful sessions
    const result = await adapter.query(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as session_count
      FROM sessions s
      LEFT JOIN session_ratings sr ON s.id = sr.session_id
      WHERE s.counselor_id = ? AND s.participant_id = ? AND s.status = 'completed'
    `, [counselorId, userId]);

    if (result.rows.length === 0 || result.rows[0].session_count === 0) return 0.5;

    const avgRating = result.rows[0].avg_rating || 3.0;
    return avgRating / 5.0;
  }

  private static getWeightsForUrgency(urgency: RoutingRequest['urgency']): Record<string, number> {
    const baseWeights = {
      availability: 0.2,
      specialization: 0.15,
      experience: 0.2,
      load: 0.15,
      timezone: 0.1,
      language: 0.1,
      rating: 0.05,
      compatibility: 0.05
    };

    // Adjust weights for high urgency
    if (urgency === 'critical' || urgency === 'high') {
      return {
        ...baseWeights,
        experience: 0.3,
        availability: 0.25,
        load: 0.2,
        specialization: 0.1,
        timezone: 0.05,
        language: 0.05,
        rating: 0.03,
        compatibility: 0.02
      };
    }

    return baseWeights;
  }

  private static generateReasoning(components: Record<string, number>): string[] {
    const reasoning = [];

    if (components.experience > 0.8) reasoning.push('High counselor experience');
    if (components.specialization > 0.8) reasoning.push('Specialization match');
    if (components.timezone > 0.8) reasoning.push('Timezone compatibility');
    if (components.load > 0.8) reasoning.push('Low counselor load');
    if (components.rating > 0.8) reasoning.push('High counselor rating');

    return reasoning.length > 0 ? reasoning : ['General availability match'];
  }

  private static getTimezoneOffset(timezone: string): number {
    // Simplified timezone offset calculation
    const offsets: Record<string, number> = {
      'America/New_York': -5,
      'America/Los_Angeles': -8,
      'Europe/London': 0,
      'Europe/Paris': 1,
      'Asia/Tokyo': 9,
      'Australia/Sydney': 10,
      // Add more as needed
    };

    return offsets[timezone] || 0;
  }

  static async updateCounselorAvailability(counselorId: string, available: boolean): Promise<void> {
    const adapter = db.getAdapter();

    await adapter.query(
      'UPDATE counselor_profiles SET availability = ? WHERE user_id = ?',
      [available, counselorId]
    );
  }

  static async getCounselorLoad(counselorId: string): Promise<{ current: number; max: number }> {
    const adapter = db.getAdapter();

    const result = await adapter.query(`
      SELECT
        c.max_sessions as maxLoad,
        COUNT(s.id) as currentLoad
      FROM counselor_profiles c
      LEFT JOIN sessions s ON c.user_id = s.counselor_id AND s.status = 'active'
      WHERE c.user_id = ?
      GROUP BY c.max_sessions
    `, [counselorId]);

    return result.length > 0 ? {
      current: result[0].currentLoad,
      max: result[0].maxLoad
    } : { current: 0, max: 5 };
  }
}
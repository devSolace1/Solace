import type { CounselorAvailability } from '../types';

export interface CounselorProfile {
  id: string;
  specializations: string[];
  experience: number; // years
  currentLoad: number; // active sessions
  isAvailable: boolean;
}

export interface MatchingCriteria {
  emotionalSeverity: 'low' | 'medium' | 'high' | 'crisis';
  userPreferences?: string[];
  sessionHistory?: string[];
}

export class CounselorMatcherService {
  static async findBestMatch(criteria: MatchingCriteria): Promise<string | null> {
    try {
      const response = await fetch('/api/counselor/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteria)
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.counselorId || null;
    } catch (error) {
      console.error('Matching error:', error);
      return null;
    }
  }

  static calculateMatchScore(
    counselor: CounselorProfile,
    criteria: MatchingCriteria
  ): number {
    let score = 0;

    // Availability bonus
    if (counselor.isAvailable) score += 50;

    // Load penalty (lower load = higher score)
    score += Math.max(0, 30 - counselor.currentLoad * 5);

    // Specialization match
    if (criteria.userPreferences && counselor.specializations.length > 0) {
      const matches = criteria.userPreferences.filter(pref =>
        counselor.specializations.includes(pref)
      );
      score += matches.length * 20;
    }

    // Emotional severity consideration
    if (criteria.emotionalSeverity === 'crisis') {
      score += 40; // Prioritize experienced counselors for crisis
    } else if (criteria.emotionalSeverity === 'high') {
      score += 20;
    }

    // Experience bonus
    score += Math.min(counselor.experience * 2, 20);

    return score;
  }

  static async getAvailableCounselors(): Promise<CounselorProfile[]> {
    try {
      const response = await fetch('/api/counselor/available');
      if (!response.ok) return [];

      const data = await response.json();
      return data.counselors || [];
    } catch (error) {
      console.error('Error fetching counselors:', error);
      return [];
    }
  }
}
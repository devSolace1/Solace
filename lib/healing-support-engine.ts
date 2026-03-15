// V9 Healing Support Logic Engine
// Provides contextual healing guidance based on emotional state analysis

export interface EmotionalContext {
  currentMood: number; // 1-10 scale
  emotionalState: 'stable' | 'recovering' | 'distressed' | 'high_risk';
  recentTriggers: string[]; // e.g., ['heartbreak', 'anxiety', 'grief']
  timeSinceLastCrisis: number; // hours
  recentActivity: {
    sessionsLastWeek: number;
    supportCircleParticipation: number;
    journalingFrequency: number;
  };
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  progressPattern: 'improving' | 'stable' | 'plateau' | 'relapse_risk' | 'high_risk';
}

export interface HealingSuggestion {
  id: string;
  type: 'breathing_exercise' | 'journaling' | 'support_circle' | 'rest_period' | 'counselor_support' | 'peer_connection' | 'self_care' | 'professional_help';
  title: string;
  description: string;
  rationale: string;
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  estimatedDuration: number; // minutes
  difficulty: 'easy' | 'moderate' | 'challenging';
  prerequisites?: string[];
  contraindications?: string[];
  successMetrics?: string[];
}

export interface HealingGuidanceResponse {
  primarySuggestion: HealingSuggestion;
  secondarySuggestions: HealingSuggestion[];
  contextualNotes: string[];
  escalationTriggers: string[];
  followUpTiming: number; // hours until next check-in
}

export class HealingSupportEngine {
  private static instance: HealingSupportEngine;

  // Healing suggestion templates
  private readonly SUGGESTIONS: Record<string, Omit<HealingSuggestion, 'id'>> = {
    breathing_exercise: {
      type: 'breathing_exercise',
      title: '4-7-8 Breathing Exercise',
      description: 'Inhale for 4 seconds, hold for 7 seconds, exhale for 8 seconds. Repeat 4 times.',
      rationale: 'Activates the parasympathetic nervous system to reduce anxiety and promote calm.',
      urgency: 'medium',
      estimatedDuration: 2,
      difficulty: 'easy',
      successMetrics: ['Reduced heart rate', 'Feeling of calm', 'Clearer thinking']
    },

    journaling: {
      type: 'journaling',
      title: 'Emotional Processing Journal',
      description: 'Write about your current feelings, what triggered them, and one small positive action you can take.',
      rationale: 'Externalizing emotions helps process them and identify patterns.',
      urgency: 'medium',
      estimatedDuration: 10,
      difficulty: 'moderate',
      successMetrics: ['Emotional clarity', 'Identified triggers', 'Actionable insights']
    },

    support_circle: {
      type: 'support_circle',
      title: 'Join a Support Circle',
      description: 'Connect with others experiencing similar challenges in a moderated peer support environment.',
      rationale: 'Peer support provides validation, reduces isolation, and offers coping strategies.',
      urgency: 'medium',
      estimatedDuration: 30,
      difficulty: 'easy',
      successMetrics: ['Feeling heard', 'New coping strategies', 'Reduced isolation']
    },

    rest_period: {
      type: 'rest_period',
      title: 'Compassionate Rest Period',
      description: 'Take intentional time for self-care activities like walking, reading, or gentle hobbies.',
      rationale: 'Rest allows emotional processing and prevents burnout during recovery.',
      urgency: 'low',
      estimatedDuration: 60,
      difficulty: 'easy',
      successMetrics: ['Renewed energy', 'Improved mood', 'Better perspective']
    },

    counselor_support: {
      type: 'counselor_support',
      title: 'Connect with a Counselor',
      description: 'Start a confidential conversation with a trained emotional support counselor.',
      rationale: 'Professional guidance provides personalized strategies and crisis intervention.',
      urgency: 'high',
      estimatedDuration: 45,
      difficulty: 'easy',
      prerequisites: ['Available counselor'],
      successMetrics: ['Personalized support', 'Crisis intervention', 'Coping strategies']
    },

    peer_connection: {
      type: 'peer_connection',
      title: 'Peer Support Connection',
      description: 'Reach out to a peer supporter who has experienced similar challenges.',
      rationale: 'Peer support offers empathy and practical advice from shared experience.',
      urgency: 'medium',
      estimatedDuration: 20,
      difficulty: 'easy',
      successMetrics: ['Feeling understood', 'Practical advice', 'Hope from recovery stories']
    },

    self_care: {
      type: 'self_care',
      title: 'Self-Care Ritual',
      description: 'Engage in nurturing activities like a warm bath, favorite music, or comforting routine.',
      rationale: 'Self-care builds emotional resilience and provides comfort during distress.',
      urgency: 'low',
      estimatedDuration: 30,
      difficulty: 'easy',
      successMetrics: ['Feeling cared for', 'Reduced stress', 'Emotional comfort']
    },

    professional_help: {
      type: 'professional_help',
      title: 'Professional Mental Health Support',
      description: 'Consider connecting with licensed mental health professionals for comprehensive care.',
      rationale: 'Professional treatment may be necessary for complex emotional challenges.',
      urgency: 'immediate',
      estimatedDuration: 60,
      difficulty: 'moderate',
      successMetrics: ['Comprehensive assessment', 'Treatment plan', 'Ongoing professional support']
    }
  };

  private constructor() {}

  static getInstance(): HealingSupportEngine {
    if (!HealingSupportEngine.instance) {
      HealingSupportEngine.instance = new HealingSupportEngine();
    }
    return HealingSupportEngine.instance;
  }

  /**
   * Generate personalized healing guidance based on emotional context
   */
  generateHealingGuidance(context: EmotionalContext): HealingGuidanceResponse {
    const suggestions = this.evaluateSuggestions(context);
    const rankedSuggestions = this.rankSuggestions(suggestions, context);

    const response: HealingGuidanceResponse = {
      primarySuggestion: rankedSuggestions[0],
      secondarySuggestions: rankedSuggestions.slice(1, 4), // Top 3 additional suggestions
      contextualNotes: this.generateContextualNotes(context),
      escalationTriggers: this.identifyEscalationTriggers(context),
      followUpTiming: this.calculateFollowUpTiming(context)
    };

    return response;
  }

  /**
   * Evaluate which suggestions are appropriate for the current context
   */
  private evaluateSuggestions(context: EmotionalContext): HealingSuggestion[] {
    const applicableSuggestions: HealingSuggestion[] = [];
    let suggestionCounter = 0;

    // Critical risk - immediate professional help
    if (context.riskLevel === 'critical') {
      applicableSuggestions.push({
        ...this.SUGGESTIONS.professional_help,
        id: `suggestion_${suggestionCounter++}`,
        urgency: 'immediate' as const
      });
    }

    // High risk - prioritize counselor support
    if (context.riskLevel === 'high') {
      applicableSuggestions.push({
        ...this.SUGGESTIONS.counselor_support,
        id: `suggestion_${suggestionCounter++}`,
        urgency: 'high' as const
      });
    }

    // High distress or low mood - breathing exercises
    if (context.emotionalState === 'high_risk' || context.emotionalState === 'distressed' || context.currentMood <= 3) {
      applicableSuggestions.push({
        ...this.SUGGESTIONS.breathing_exercise,
        id: `suggestion_${suggestionCounter++}`,
        urgency: context.currentMood <= 2 ? 'high' : 'medium'
      });
    }

    // Recent crisis - rest and self-care
    if (context.timeSinceLastCrisis < 24) {
      applicableSuggestions.push({
        ...this.SUGGESTIONS.rest_period,
        id: `suggestion_${suggestionCounter++}`,
        urgency: 'medium' as const
      });
    }

    // Low activity - encourage engagement
    if (context.recentActivity.sessionsLastWeek < 1) {
      applicableSuggestions.push({
        ...this.SUGGESTIONS.support_circle,
        id: `suggestion_${suggestionCounter++}`,
        urgency: 'medium' as const
      });
    }

    // Plateau or relapse risk - journaling for insight
    if (context.progressPattern === 'plateau' || context.progressPattern === 'relapse_risk') {
      applicableSuggestions.push({
        ...this.SUGGESTIONS.journaling,
        id: `suggestion_${suggestionCounter++}`,
        urgency: 'medium' as const
      });
    }

    // General self-care for maintenance
    if (context.emotionalState === 'stable' || context.emotionalState === 'recovering') {
      applicableSuggestions.push({
        ...this.SUGGESTIONS.self_care,
        id: `suggestion_${suggestionCounter++}`,
        urgency: 'low' as const
      });
    }

    // Always include peer connection as secondary option
    if (context.recentActivity.supportCircleParticipation < 3) {
      applicableSuggestions.push({
        ...this.SUGGESTIONS.peer_connection,
        id: `suggestion_${suggestionCounter++}`,
        urgency: 'low' as const
      });
    }

    return applicableSuggestions;
  }

  /**
   * Rank suggestions by appropriateness and urgency
   */
  private rankSuggestions(suggestions: HealingSuggestion[], context: EmotionalContext): HealingSuggestion[] {
    return suggestions.sort((a, b) => {
      // Primary sort by urgency
      const urgencyOrder = { immediate: 4, high: 3, medium: 2, low: 1 };
      const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;

      // Secondary sort by contextual relevance
      const aScore = this.calculateContextualRelevance(a, context);
      const bScore = this.calculateContextualRelevance(b, context);
      return bScore - aScore;
    });
  }

  /**
   * Calculate how relevant a suggestion is for the current context
   */
  private calculateContextualRelevance(suggestion: HealingSuggestion, context: EmotionalContext): number {
    let score = 0;

    // Base relevance by emotional state
    switch (context.emotionalState) {
      case 'high_risk':
        if (suggestion.type === 'counselor_support' || suggestion.type === 'professional_help') score += 3;
        if (suggestion.type === 'breathing_exercise') score += 2;
        break;
      case 'distressed':
        if (suggestion.type === 'breathing_exercise' || suggestion.type === 'journaling') score += 2;
        if (suggestion.type === 'support_circle') score += 1;
        break;
      case 'recovering':
        if (suggestion.type === 'journaling' || suggestion.type === 'self_care') score += 2;
        if (suggestion.type === 'support_circle') score += 1;
        break;
      case 'stable':
        if (suggestion.type === 'self_care' || suggestion.type === 'peer_connection') score += 1;
        break;
    }

    // Adjust for recent activity
    if (context.recentActivity.journalingFrequency > 3 && suggestion.type === 'journaling') {
      score -= 1; // Reduce if already journaling frequently
    }

    if (context.recentActivity.supportCircleParticipation > 5 && suggestion.type === 'support_circle') {
      score -= 1; // Reduce if already highly engaged
    }

    // Adjust for triggers
    if (context.recentTriggers.includes('anxiety') && suggestion.type === 'breathing_exercise') {
      score += 1;
    }

    if (context.recentTriggers.includes('isolation') && suggestion.type === 'support_circle') {
      score += 1;
    }

    return Math.max(0, score);
  }

  /**
   * Generate contextual notes to accompany suggestions
   */
  private generateContextualNotes(context: EmotionalContext): string[] {
    const notes: string[] = [];

    if (context.riskLevel === 'critical') {
      notes.push('Your current state indicates immediate professional support may be necessary.');
    }

    if (context.timeSinceLastCrisis < 24) {
      notes.push('Recent distress signals suggest prioritizing rest and gentle self-care.');
    }

    if (context.progressPattern === 'plateau') {
      notes.push('Current plateau phase may benefit from exploring new approaches or additional support.');
    }

    if (context.recentActivity.sessionsLastWeek === 0) {
      notes.push('Regular engagement with support resources is associated with better recovery outcomes.');
    }

    if (context.emotionalState === 'stable') {
      notes.push('Your stability is a strength - consider how to maintain and build upon this foundation.');
    }

    // Add trigger-specific notes
    if (context.recentTriggers.includes('heartbreak')) {
      notes.push('Heartbreak recovery often follows a non-linear path - be patient with yourself.');
    }

    if (context.recentTriggers.includes('grief')) {
      notes.push('Grief processing takes time and varies greatly between individuals.');
    }

    return notes;
  }

  /**
   * Identify triggers that should prompt escalation
   */
  private identifyEscalationTriggers(context: EmotionalContext): string[] {
    const triggers: string[] = [];

    if (context.riskLevel === 'critical') {
      triggers.push('Immediate crisis intervention required');
    }

    if (context.currentMood <= 2) {
      triggers.push('Severe emotional distress - consider emergency contact');
    }

    if (context.timeSinceLastCrisis < 1) {
      triggers.push('Very recent crisis - monitor closely for safety');
    }

    if (context.progressPattern === 'high_risk') {
      triggers.push('High relapse risk detected - increased support recommended');
    }

    return triggers;
  }

  /**
   * Calculate appropriate timing for follow-up check-in
   */
  private calculateFollowUpTiming(context: EmotionalContext): number {
    // Base timing in hours
    let timing = 24; // Default: daily check-in

    if (context.riskLevel === 'critical') {
      timing = 2; // Every 2 hours
    } else if (context.riskLevel === 'high') {
      timing = 6; // Every 6 hours
    } else if (context.emotionalState === 'high_risk') {
      timing = 12; // Every 12 hours
    } else if (context.progressPattern === 'relapse_risk') {
      timing = 12; // Every 12 hours
    } else if (context.emotionalState === 'stable') {
      timing = 48; // Every 2 days
    }

    // Adjust for recent activity
    if (context.recentActivity.sessionsLastWeek > 3) {
      timing = Math.max(timing * 0.8, 12); // Reduce timing if highly engaged
    }

    return Math.round(timing);
  }

  /**
   * Track effectiveness of healing suggestions
   */
  trackSuggestionEffectiveness(
    suggestionId: string,
    userId: string,
    response: 'accepted' | 'dismissed' | 'completed',
    effectivenessRating?: number,
    feedback?: string
  ): void {
    // This would integrate with the healing_guidance_interactions table
    // Implementation would store the interaction for research and improvement
    console.log(`Tracking suggestion effectiveness: ${suggestionId} for user ${userId}`);
  }

  /**
   * Get personalized suggestion history for a user
   */
  getSuggestionHistory(userId: string, limit: number = 10): Promise<HealingSuggestion[]> {
    // This would query the healing_guidance_interactions table
    // Return previously suggested actions for personalization
    return Promise.resolve([]);
  }
}

export const healingSupportEngine = HealingSupportEngine.getInstance();
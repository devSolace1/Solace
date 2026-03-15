// V9 Clinical Recovery Tracking Engine
// Analyzes behavioral signals to determine recovery progress

export interface RecoverySignals {
  moodHistory: Array<{ score: number; date: string; intensity: number }>;
  sessionFrequency: number; // sessions per week
  conversationIntensity: number; // average messages per session
  panicEvents: Array<{ severity: number; date: string; resolved: boolean }>;
  supportCircleParticipation: number; // engagement score
  timeSinceLastCrisis: number; // days
  counselorInteractions: number; // sessions with counselors
  aiInteractions: number; // AI assistance usage
}

export interface RecoveryIndicators {
  recoveryProgressScore: number; // 0.0 to 1.0
  emotionalStabilityIndex: number; // 0.0 to 1.0
  riskLevelIndicator: 'low' | 'moderate' | 'high' | 'critical';
  progressPattern: 'improving' | 'stable' | 'plateau' | 'relapse_risk' | 'high_risk';
  confidenceScore: number; // 0.0 to 1.0
}

export interface RecoveryInsights {
  keyStrengths: string[];
  areasForAttention: string[];
  recommendedActions: string[];
  projectedTrajectory: string;
  nextMilestone: string;
}

export class ClinicalRecoveryTracker {
  private static instance: ClinicalRecoveryTracker;

  // Recovery algorithm weights (clinically informed)
  private readonly WEIGHTS = {
    moodStability: 0.25,
    sessionEngagement: 0.20,
    crisisManagement: 0.20,
    socialSupport: 0.15,
    professionalHelp: 0.10,
    timeFactor: 0.10
  };

  // Thresholds for risk assessment
  private readonly THRESHOLDS = {
    highRiskMood: 3.0, // Average mood score
    criticalPanicFrequency: 3, // Per week
    lowEngagement: 0.3, // Session frequency ratio
    stabilityThreshold: 0.7, // Stability index
    relapseRiskWindow: 30 // Days since last crisis
  };

  private constructor() {}

  static getInstance(): ClinicalRecoveryTracker {
    if (!ClinicalRecoveryTracker.instance) {
      ClinicalRecoveryTracker.instance = new ClinicalRecoveryTracker();
    }
    return ClinicalRecoveryTracker.instance;
  }

  /**
   * Calculate comprehensive recovery indicators from behavioral signals
   */
  calculateRecoveryIndicators(signals: RecoverySignals): RecoveryIndicators {
    // Calculate individual component scores
    const moodStability = this.calculateMoodStability(signals.moodHistory);
    const sessionEngagement = this.calculateSessionEngagement(signals);
    const crisisManagement = this.calculateCrisisManagement(signals.panicEvents);
    const socialSupport = this.calculateSocialSupport(signals.supportCircleParticipation);
    const professionalHelp = this.calculateProfessionalHelp(signals);
    const timeFactor = this.calculateTimeFactor(signals.timeSinceLastCrisis);

    // Weighted recovery progress score
    const recoveryProgressScore = (
      moodStability * this.WEIGHTS.moodStability +
      sessionEngagement * this.WEIGHTS.sessionEngagement +
      crisisManagement * this.WEIGHTS.crisisManagement +
      socialSupport * this.WEIGHTS.socialSupport +
      professionalHelp * this.WEIGHTS.professionalHelp +
      timeFactor * this.WEIGHTS.timeFactor
    );

    // Emotional stability index (inverse of variability)
    const emotionalStabilityIndex = this.calculateEmotionalStability(signals.moodHistory);

    // Risk level assessment
    const riskLevelIndicator = this.assessRiskLevel(
      signals,
      recoveryProgressScore,
      emotionalStabilityIndex
    );

    // Progress pattern classification
    const progressPattern = this.classifyProgressPattern(
      signals.moodHistory,
      recoveryProgressScore
    );

    // Confidence score based on data completeness and consistency
    const confidenceScore = this.calculateConfidenceScore(signals);

    return {
      recoveryProgressScore: Math.max(0, Math.min(1, recoveryProgressScore)),
      emotionalStabilityIndex,
      riskLevelIndicator,
      progressPattern,
      confidenceScore
    };
  }

  /**
   * Generate clinical insights and recommendations
   */
  generateRecoveryInsights(signals: RecoverySignals, indicators: RecoveryIndicators): RecoveryInsights {
    const insights: RecoveryInsights = {
      keyStrengths: [],
      areasForAttention: [],
      recommendedActions: [],
      projectedTrajectory: '',
      nextMilestone: ''
    };

    // Analyze strengths
    if (indicators.emotionalStabilityIndex > 0.7) {
      insights.keyStrengths.push('Strong emotional stability demonstrated');
    }
    if (signals.sessionFrequency > 2) {
      insights.keyStrengths.push('Consistent engagement with support services');
    }
    if (signals.supportCircleParticipation > 5) {
      insights.keyStrengths.push('Active participation in peer support');
    }

    // Identify areas for attention
    if (indicators.recoveryProgressScore < 0.4) {
      insights.areasForAttention.push('Recovery progress indicates need for additional support');
    }
    if (signals.panicEvents.length > 0 && signals.timeSinceLastCrisis < 7) {
      insights.areasForAttention.push('Recent crisis events suggest heightened vulnerability');
    }
    if (signals.sessionFrequency < 1) {
      insights.areasForAttention.push('Low engagement frequency may impact recovery trajectory');
    }

    // Generate recommendations
    if (indicators.riskLevelIndicator === 'high' || indicators.riskLevelIndicator === 'critical') {
      insights.recommendedActions.push('Immediate professional counseling recommended');
      insights.recommendedActions.push('Consider intensive support program');
    } else if (indicators.progressPattern === 'plateau') {
      insights.recommendedActions.push('Explore new coping strategies or support approaches');
      insights.recommendedActions.push('Consider adjusting treatment plan');
    } else if (indicators.progressPattern === 'relapse_risk') {
      insights.recommendedActions.push('Increased monitoring and support recommended');
      insights.recommendedActions.push('Review current coping mechanisms');
    }

    // Add general recommendations based on engagement
    if (signals.supportCircleParticipation < 3) {
      insights.recommendedActions.push('Consider joining peer support communities');
    }
    if (signals.professionalHelp < 1) {
      insights.recommendedActions.push('Regular counseling sessions beneficial for recovery');
    }

    // Project trajectory
    insights.projectedTrajectory = this.projectTrajectory(indicators, signals);

    // Next milestone
    insights.nextMilestone = this.identifyNextMilestone(indicators, signals);

    return insights;
  }

  // Private calculation methods

  private calculateMoodStability(moodHistory: RecoverySignals['moodHistory']): number {
    if (moodHistory.length < 2) return 0.5; // Neutral score with limited data

    const recentMoods = moodHistory.slice(-14); // Last 2 weeks
    const avgMood = recentMoods.reduce((sum, m) => sum + m.score, 0) / recentMoods.length;

    // Normalize to 0-1 scale (mood 1-10 becomes 0-1)
    const normalizedMood = (avgMood - 1) / 9;

    // Penalize extreme variability
    const variance = this.calculateVariance(recentMoods.map(m => m.score));
    const stabilityPenalty = Math.min(variance / 10, 0.5); // Max 50% penalty

    return Math.max(0, Math.min(1, normalizedMood - stabilityPenalty));
  }

  private calculateSessionEngagement(signals: RecoverySignals): number {
    // Target: 2-3 sessions per week
    const targetFrequency = 2.5;
    const engagementRatio = signals.sessionFrequency / targetFrequency;

    // Bonus for conversation intensity
    const intensityBonus = Math.min(signals.conversationIntensity / 10, 0.2);

    return Math.min(1, engagementRatio + intensityBonus);
  }

  private calculateCrisisManagement(panicEvents: RecoverySignals['panicEvents']): number {
    if (panicEvents.length === 0) return 1.0; // No crises = excellent management

    const recentEvents = panicEvents.filter(e =>
      new Date(e.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    if (recentEvents.length === 0) return 0.9; // No recent crises

    // Calculate resolution rate and severity
    const resolvedRate = recentEvents.filter(e => e.resolved).length / recentEvents.length;
    const avgSeverity = recentEvents.reduce((sum, e) => sum + e.severity, 0) / recentEvents.length;

    // Higher severity reduces score, lower resolution rate reduces score
    const severityPenalty = (avgSeverity - 1) / 4; // 1-5 scale becomes 0-1
    const resolutionBonus = resolvedRate;

    return Math.max(0, Math.min(1, resolutionBonus - severityPenalty));
  }

  private calculateSocialSupport(participationScore: number): number {
    // Normalize participation score (1-10) to 0-1
    return Math.min(1, participationScore / 10);
  }

  private calculateProfessionalHelp(signals: RecoverySignals): number {
    // Prefer mix of counselor and AI support
    const counselorRatio = signals.counselorInteractions / Math.max(signals.counselorInteractions + signals.aiInteractions, 1);
    const totalEngagement = signals.counselorInteractions + (signals.aiInteractions * 0.3); // AI counts less

    return Math.min(1, (counselorRatio * 0.7) + (totalEngagement / 5 * 0.3));
  }

  private calculateTimeFactor(daysSinceLastCrisis: number): number {
    // Recovery improves over time since last crisis
    if (daysSinceLastCrisis > 90) return 1.0; // 3+ months = full recovery time bonus
    if (daysSinceLastCrisis > 30) return 0.7; // 1+ month = good recovery time
    if (daysSinceLastCrisis > 7) return 0.4; // 1+ week = moderate recovery time
    return 0.1; // Recent crisis = minimal time factor
  }

  private calculateEmotionalStability(moodHistory: RecoverySignals['moodHistory']): number {
    if (moodHistory.length < 3) return 0.5;

    const recentMoods = moodHistory.slice(-7); // Last week
    const variance = this.calculateVariance(recentMoods.map(m => m.score));

    // Lower variance = higher stability
    return Math.max(0, Math.min(1, 1 - (variance / 20))); // Max variance of 20 = 0 stability
  }

  private assessRiskLevel(
    signals: RecoverySignals,
    recoveryScore: number,
    stabilityIndex: number
  ): 'low' | 'moderate' | 'high' | 'critical' {

    // Critical risk factors
    if (signals.panicEvents.filter(e => !e.resolved &&
        new Date(e.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length > 0) {
      return 'critical';
    }

    // High risk factors
    if (signals.panicEvents.filter(e =>
        new Date(e.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length >= 3) {
      return 'high';
    }

    if (recoveryScore < 0.2 || stabilityIndex < 0.3) {
      return 'high';
    }

    // Moderate risk
    if (recoveryScore < 0.4 || stabilityIndex < 0.5 ||
        signals.timeSinceLastCrisis < 14) {
      return 'moderate';
    }

    // Low risk
    return 'low';
  }

  private classifyProgressPattern(
    moodHistory: RecoverySignals['moodHistory'],
    recoveryScore: number
  ): 'improving' | 'stable' | 'plateau' | 'relapse_risk' | 'high_risk' {

    if (moodHistory.length < 7) return 'stable'; // Need more data

    const recent = moodHistory.slice(-7);
    const earlier = moodHistory.slice(-14, -7);

    if (earlier.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, m) => sum + m.score, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, m) => sum + m.score, 0) / earlier.length;

    const trend = recentAvg - earlierAvg;

    // Improving: consistent upward trend
    if (trend > 0.5 && recoveryScore > 0.6) return 'improving';

    // Stable: minimal change
    if (Math.abs(trend) < 0.3) return 'stable';

    // Plateau: no recent progress despite time
    if (Math.abs(trend) < 0.2 && recoveryScore < 0.5) return 'plateau';

    // Relapse risk: downward trend or very low scores
    if (trend < -0.5 || recentAvg < 3) return 'relapse_risk';

    // High risk: severe downward trend or critical scores
    if (trend < -1 || recentAvg < 2) return 'high_risk';

    return 'stable';
  }

  private calculateConfidenceScore(signals: RecoverySignals): number {
    let confidence = 0.5; // Base confidence

    // Data completeness factors
    if (signals.moodHistory.length >= 14) confidence += 0.2;
    if (signals.sessionFrequency > 0) confidence += 0.1;
    if (signals.supportCircleParticipation > 0) confidence += 0.1;
    if (signals.counselorInteractions > 0) confidence += 0.1;

    // Data recency (prefer recent data)
    const recentMoodData = signals.moodHistory.filter(m =>
      new Date(m.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    if (recentMoodData.length >= 3) confidence += 0.1;

    return Math.min(1, confidence);
  }

  private projectTrajectory(indicators: RecoveryIndicators, signals: RecoverySignals): string {
    const { progressPattern, recoveryProgressScore, riskLevelIndicator } = indicators;

    if (riskLevelIndicator === 'critical') {
      return 'Immediate intervention required to stabilize trajectory';
    }

    if (progressPattern === 'improving' && recoveryProgressScore > 0.7) {
      return 'Strong upward trajectory with high likelihood of continued progress';
    }

    if (progressPattern === 'stable' && recoveryProgressScore > 0.5) {
      return 'Stable trajectory with moderate progress expected';
    }

    if (progressPattern === 'plateau') {
      return 'Current plateau suggests need for intervention to restart progress';
    }

    if (progressPattern === 'relapse_risk') {
      return 'Vulnerable trajectory requiring close monitoring and support';
    }

    return 'Trajectory requires more data for accurate projection';
  }

  private identifyNextMilestone(indicators: RecoveryIndicators, signals: RecoverySignals): string {
    const { recoveryProgressScore, progressPattern } = indicators;

    if (recoveryProgressScore < 0.3) {
      return 'Establish consistent daily mood tracking routine';
    }

    if (recoveryProgressScore < 0.5) {
      return 'Achieve 1 week of stable mood scores above 5';
    }

    if (recoveryProgressScore < 0.7) {
      return 'Complete 2 weeks without panic events';
    }

    if (progressPattern === 'plateau') {
      return 'Break through current plateau with new coping strategies';
    }

    return 'Maintain current progress and explore advanced recovery techniques';
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }
}

export const clinicalRecoveryTracker = ClinicalRecoveryTracker.getInstance();
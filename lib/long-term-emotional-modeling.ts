// V9 Long-Term Emotional Modeling System
// Advanced emotional pattern analysis and predictive modeling

import { db } from '../database/adapter';
import { clinicalRecoveryTracker } from './clinical-recovery-tracker';

export interface EmotionalModel {
  userId: string;
  modelVersion: string;
  baselineProfile: EmotionalBaseline;
  patternAnalysis: EmotionalPatterns;
  predictiveModel: PredictiveInsights;
  riskAssessment: RiskProfile;
  interventionHistory: InterventionRecord[];
  lastUpdated: string;
  confidence: number;
}

export interface EmotionalBaseline {
  averageMood: number;
  moodVolatility: number;
  dominantEmotionalStates: { state: string; frequency: number }[];
  seasonalPatterns: { season: string; moodModifier: number }[];
  circadianRhythm: { hour: number; averageMood: number }[];
  socialInfluence: number; // -1 to 1, impact of social interactions
  stressSensitivity: number; // 0-1, how responsive to stress
  recoveryRate: number; // Days to return to baseline after disturbance
}

export interface EmotionalPatterns {
  cycles: {
    type: 'daily' | 'weekly' | 'monthly' | 'seasonal';
    period: number;
    amplitude: number;
    phase: number;
    confidence: number;
  }[];
  triggers: {
    trigger: string;
    impact: number; // -1 to 1
    frequency: number;
    recoveryTime: number; // hours
    confidence: number;
  }[];
  correlations: {
    factor: string;
    correlation: number; // -1 to 1
    lag: number; // days
    confidence: number;
  }[];
  stability: {
    overallStability: number; // 0-1
    trendDirection: 'improving' | 'stable' | 'declining';
    volatilityIndex: number;
    resilienceScore: number;
  };
}

export interface PredictiveInsights {
  shortTermPredictions: {
    timeframe: string; // '24h', '72h', '1w'
    predictedMood: number;
    confidence: number;
    riskFactors: string[];
    recommendedActions: string[];
  }[];
  longTermProjections: {
    timeframe: string; // '1m', '3m', '6m', '1y'
    projectedTrajectory: 'improving' | 'stable' | 'declining' | 'high_risk';
    confidence: number;
    keyInfluences: string[];
    interventionPoints: string[];
  }[];
  anomalyDetection: {
    currentAnomalies: {
      type: string;
      severity: number;
      description: string;
      detectedAt: string;
    }[];
    anomalyPatterns: {
      pattern: string;
      frequency: number;
      typicalTriggers: string[];
    }[];
  };
}

export interface RiskProfile {
  currentRiskLevel: 'low' | 'moderate' | 'high' | 'critical';
  riskFactors: {
    factor: string;
    level: number; // 0-1
    trend: 'increasing' | 'stable' | 'decreasing';
    lastAssessed: string;
  }[];
  protectiveFactors: {
    factor: string;
    strength: number; // 0-1
    trend: 'strengthening' | 'stable' | 'weakening';
  }[];
  crisisIndicators: {
    indicator: string;
    threshold: number;
    currentValue: number;
    status: 'normal' | 'elevated' | 'critical';
  }[];
  interventionThresholds: {
    threshold: string;
    value: number;
    triggered: boolean;
    lastTriggered?: string;
  }[];
}

export interface InterventionRecord {
  id: string;
  timestamp: string;
  type: 'preventive' | 'responsive' | 'crisis';
  trigger: string;
  actions: string[];
  outcome: 'successful' | 'partial' | 'unsuccessful' | 'pending';
  effectiveness: number; // 0-1
  followUpRequired: boolean;
  notes?: string;
}

export class LongTermEmotionalModelingSystem {
  private static instance: LongTermEmotionalModelingSystem;

  // Model parameters
  private readonly MINIMUM_DATA_POINTS = 30; // Minimum days of data for modeling
  private readonly MODEL_UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly PREDICTION_HORIZONS = [1, 3, 7, 30, 90, 180, 365]; // Days
  private readonly ANOMALY_DETECTION_SENSITIVITY = 2.5; // Standard deviations

  private constructor() {}

  static getInstance(): LongTermEmotionalModelingSystem {
    if (!LongTermEmotionalModelingSystem.instance) {
      LongTermEmotionalModelingSystem.instance = new LongTermEmotionalModelingSystem();
    }
    return LongTermEmotionalModelingSystem.instance;
  }

  /**
   * Build or update emotional model for a user
   */
  async buildEmotionalModel(userId: string, forceUpdate: boolean = false): Promise<EmotionalModel> {
    // Check if model exists and is recent
    const existingModel = await this.getExistingModel(userId);
    if (existingModel && !forceUpdate && !this.modelNeedsUpdate(existingModel)) {
      return existingModel;
    }

    // Gather comprehensive emotional data
    const emotionalData = await this.gatherEmotionalData(userId);
    if (emotionalData.length < this.MINIMUM_DATA_POINTS) {
      throw new Error(`Insufficient data for modeling. Need at least ${this.MINIMUM_DATA_POINTS} days of data.`);
    }

    // Build model components in parallel
    const [
      baseline,
      patterns,
      predictions,
      riskProfile,
      interventions
    ] = await Promise.all([
      this.calculateEmotionalBaseline(emotionalData),
      this.analyzeEmotionalPatterns(emotionalData),
      this.generatePredictiveInsights(emotionalData),
      this.assessRiskProfile(emotionalData),
      this.getInterventionHistory(userId)
    ]);

    const model: EmotionalModel = {
      userId,
      modelVersion: 'v9.1.0',
      baselineProfile: baseline,
      patternAnalysis: patterns,
      predictiveModel: predictions,
      riskAssessment: riskProfile,
      interventionHistory: interventions,
      lastUpdated: new Date().toISOString(),
      confidence: this.calculateModelConfidence(emotionalData)
    };

    // Cache the model
    await this.cacheEmotionalModel(model);

    return model;
  }

  /**
   * Get real-time emotional state assessment
   */
  async getRealTimeAssessment(userId: string): Promise<{
    currentState: string;
    moodDeviation: number;
    riskLevel: string;
    immediateActions: string[];
    confidence: number;
  }> {
    const model = await this.buildEmotionalModel(userId);
    const recentData = await this.getRecentEmotionalData(userId, 7); // Last 7 days

    const currentMood = recentData[recentData.length - 1]?.mood_score || model.baselineProfile.averageMood;
    const moodDeviation = this.calculateMoodDeviation(currentMood, model.baselineProfile);

    const riskLevel = this.assessCurrentRiskLevel(moodDeviation, model.riskAssessment);
    const immediateActions = this.generateImmediateActions(moodDeviation, riskLevel, model);

    return {
      currentState: this.classifyEmotionalState(currentMood),
      moodDeviation,
      riskLevel,
      immediateActions,
      confidence: model.confidence
    };
  }

  /**
   * Predict emotional trajectory
   */
  async predictEmotionalTrajectory(
    userId: string,
    timeframe: number // days
  ): Promise<{
    predictedTrajectory: number[];
    confidenceIntervals: { upper: number[]; lower: number[] };
    riskFactors: string[];
    recommendedInterventions: string[];
    confidence: number;
  }> {
    const model = await this.buildEmotionalModel(userId);
    const recentData = await this.getRecentEmotionalData(userId, 30);

    // Use time series analysis for prediction
    const predictions = this.generateTimeSeriesPrediction(recentData, timeframe, model);
    const confidenceIntervals = this.calculateConfidenceIntervals(predictions, model.baselineProfile.moodVolatility);
    const riskFactors = this.identifyPredictionRiskFactors(predictions, model);
    const interventions = this.recommendPredictiveInterventions(predictions, riskFactors, model);

    return {
      predictedTrajectory: predictions,
      confidenceIntervals,
      riskFactors,
      recommendedInterventions: interventions,
      confidence: model.confidence * 0.8 // Slightly lower for predictions
    };
  }

  /**
   * Detect emotional anomalies
   */
  async detectEmotionalAnomalies(userId: string): Promise<{
    anomalies: {
      type: string;
      severity: number;
      description: string;
      timestamp: string;
      confidence: number;
    }[];
    overallAnomalyScore: number;
    requiresAttention: boolean;
  }> {
    const model = await this.buildEmotionalModel(userId);
    const recentData = await this.getRecentEmotionalData(userId, 14); // Last 2 weeks

    const anomalies = [];
    let totalAnomalyScore = 0;

    // Check for mood anomalies
    const moodAnomalies = this.detectMoodAnomalies(recentData, model.baselineProfile);
    anomalies.push(...moodAnomalies.anomalies);
    totalAnomalyScore += moodAnomalies.score;

    // Check for pattern anomalies
    const patternAnomalies = this.detectPatternAnomalies(recentData, model.patternAnalysis);
    anomalies.push(...patternAnomalies.anomalies);
    totalAnomalyScore += patternAnomalies.score;

    // Check for trigger anomalies
    const triggerAnomalies = this.detectTriggerAnomalies(recentData, model.patternAnalysis.triggers);
    anomalies.push(...triggerAnomalies.anomalies);
    totalAnomalyScore += triggerAnomalies.score;

    const overallScore = totalAnomalyScore / 3; // Average of anomaly types
    const requiresAttention = overallScore > 0.7 || anomalies.some(a => a.severity > 0.8);

    return {
      anomalies: anomalies.sort((a, b) => b.severity - a.severity),
      overallAnomalyScore: overallScore,
      requiresAttention
    };
  }

  // Private methods for model building

  private async calculateEmotionalBaseline(emotionalData: any[]): Promise<EmotionalBaseline> {
    const moodScores = emotionalData.map(d => d.mood_score);

    // Calculate basic statistics
    const averageMood = moodScores.reduce((sum, score) => sum + score, 0) / moodScores.length;
    const moodVolatility = this.calculateStandardDeviation(moodScores);

    // Analyze emotional states
    const stateCounts = emotionalData.reduce((acc, data) => {
      acc[data.emotional_state] = (acc[data.emotional_state] || 0) + 1;
      return acc;
    }, {} as { [state: string]: number });

    const dominantStates = Object.entries(stateCounts)
      .map(([state, count]) => ({ state, frequency: count / emotionalData.length }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    // Analyze seasonal patterns
    const seasonalPatterns = this.analyzeSeasonalPatterns(emotionalData);

    // Analyze circadian rhythms
    const circadianRhythm = this.analyzeCircadianRhythm(emotionalData);

    // Calculate derived metrics
    const socialInfluence = await this.calculateSocialInfluence(emotionalData);
    const stressSensitivity = this.calculateStressSensitivity(emotionalData);
    const recoveryRate = this.calculateRecoveryRate(emotionalData);

    return {
      averageMood,
      moodVolatility,
      dominantEmotionalStates: dominantStates,
      seasonalPatterns,
      circadianRhythm,
      socialInfluence,
      stressSensitivity,
      recoveryRate
    };
  }

  private async analyzeEmotionalPatterns(emotionalData: any[]): Promise<EmotionalPatterns> {
    // Detect cycles using Fourier analysis or autocorrelation
    const cycles = this.detectEmotionalCycles(emotionalData);

    // Identify triggers and their impacts
    const triggers = await this.identifyEmotionalTriggers(emotionalData);

    // Find correlations with external factors
    const correlations = await this.findEmotionalCorrelations(emotionalData);

    // Assess overall stability
    const stability = this.assessEmotionalStability(emotionalData);

    return {
      cycles,
      triggers,
      correlations,
      stability
    };
  }

  private async generatePredictiveInsights(emotionalData: any[]): Promise<PredictiveInsights> {
    // Generate short-term predictions (1-7 days)
    const shortTermPredictions = this.PREDICTION_HORIZONS
      .filter(h => h <= 7)
      .map(timeframe => ({
        timeframe: `${timeframe}d`,
        predictedMood: this.predictMoodAtTimeframe(emotionalData, timeframe),
        confidence: Math.max(0.1, 1 - (timeframe / 30)), // Confidence decreases with time
        riskFactors: this.identifyRiskFactorsForTimeframe(emotionalData, timeframe),
        recommendedActions: this.generateRecommendedActionsForTimeframe(emotionalData, timeframe)
      }));

    // Generate long-term projections (1-12 months)
    const longTermProjections = this.PREDICTION_HORIZONS
      .filter(h => h >= 30)
      .map(timeframe => ({
        timeframe: timeframe <= 90 ? `${Math.round(timeframe/30)}m` : '1y',
        projectedTrajectory: this.projectLongTermTrajectory(emotionalData, timeframe),
        confidence: Math.max(0.05, 0.8 - (timeframe / 365) * 0.7), // Lower confidence for long term
        keyInfluences: this.identifyKeyInfluences(emotionalData, timeframe),
        interventionPoints: this.identifyInterventionPoints(emotionalData, timeframe)
      }));

    // Detect current anomalies
    const anomalyDetection = await this.performAnomalyDetection(emotionalData);

    return {
      shortTermPredictions,
      longTermProjections,
      anomalyDetection
    };
  }

  private async assessRiskProfile(emotionalData: any[]): Promise<RiskProfile> {
    const currentRiskLevel = this.calculateCurrentRiskLevel(emotionalData);
    const riskFactors = this.identifyRiskFactors(emotionalData);
    const protectiveFactors = this.identifyProtectiveFactors(emotionalData);
    const crisisIndicators = this.monitorCrisisIndicators(emotionalData);
    const interventionThresholds = this.defineInterventionThresholds(emotionalData);

    return {
      currentRiskLevel,
      riskFactors,
      protectiveFactors,
      crisisIndicators,
      interventionThresholds
    };
  }

  // Helper methods

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  private analyzeSeasonalPatterns(emotionalData: any[]): { season: string; moodModifier: number }[] {
    // Group by month and calculate average mood deviation from baseline
    const monthlyData = emotionalData.reduce((acc, data) => {
      const month = new Date(data.logged_at).getMonth();
      if (!acc[month]) acc[month] = [];
      acc[month].push(data.mood_score);
      return acc;
    }, {} as { [month: number]: number[] });

    const overallAverage = emotionalData.reduce((sum, data) => sum + data.mood_score, 0) / emotionalData.length;

    return Object.entries(monthlyData).map(([month, scores]) => {
      const monthlyAverage = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const modifier = monthlyAverage - overallAverage;
      return {
        season: this.getSeasonName(parseInt(month)),
        moodModifier: modifier
      };
    });
  }

  private analyzeCircadianRhythm(emotionalData: any[]): { hour: number; averageMood: number }[] {
    const hourlyData = emotionalData.reduce((acc, data) => {
      const hour = new Date(data.logged_at).getHours();
      if (!acc[hour]) acc[hour] = [];
      acc[hour].push(data.mood_score);
      return acc;
    }, {} as { [hour: number]: number[] });

    return Object.entries(hourlyData).map(([hour, scores]) => ({
      hour: parseInt(hour),
      averageMood: scores.reduce((sum, score) => sum + score, 0) / scores.length
    })).sort((a, b) => a.hour - b.hour);
  }

  private async calculateSocialInfluence(emotionalData: any[]): Promise<number> {
    // This would analyze correlation between social interactions and mood changes
    // For now, return a placeholder based on available data
    return 0.3; // Placeholder
  }

  private calculateStressSensitivity(emotionalData: any[]): number {
    // Analyze how quickly mood responds to negative events
    // For now, return a placeholder
    return 0.6; // Placeholder
  }

  private calculateRecoveryRate(emotionalData: any[]): number {
    // Calculate average time to return to baseline after mood disturbances
    // For now, return a placeholder
    return 3.5; // Days
  }

  private detectEmotionalCycles(emotionalData: any[]): EmotionalPatterns['cycles'] {
    // Implement cycle detection using autocorrelation or FFT
    // For now, return common cycles
    return [
      {
        type: 'daily',
        period: 24,
        amplitude: 0.5,
        phase: 0,
        confidence: 0.7
      },
      {
        type: 'weekly',
        period: 168,
        amplitude: 0.3,
        phase: 0,
        confidence: 0.6
      }
    ];
  }

  private async identifyEmotionalTriggers(emotionalData: any[]): Promise<EmotionalPatterns['triggers']> {
    // Analyze what events correlate with mood changes
    // This would require more sophisticated analysis
    return [
      {
        trigger: 'session_participation',
        impact: 0.4,
        frequency: 0.1,
        recoveryTime: 24,
        confidence: 0.8
      }
    ];
  }

  private async findEmotionalCorrelations(emotionalData: any[]): Promise<EmotionalPatterns['correlations']> {
    // Find correlations with external factors
    return [
      {
        factor: 'session_frequency',
        correlation: 0.6,
        lag: 0,
        confidence: 0.75
      }
    ];
  }

  private assessEmotionalStability(emotionalData: any[]): EmotionalPatterns['stability'] {
    const moodScores = emotionalData.map(d => d.mood_score);
    const volatility = this.calculateStandardDeviation(moodScores);
    const trend = this.calculateMoodTrend(emotionalData);

    return {
      overallStability: Math.max(0, 1 - volatility / 5), // Normalize to 0-1
      trendDirection: trend > 0.1 ? 'improving' : trend < -0.1 ? 'declining' : 'stable',
      volatilityIndex: volatility,
      resilienceScore: this.calculateResilienceScore(emotionalData)
    };
  }

  private calculateMoodTrend(emotionalData: any[]): number {
    if (emotionalData.length < 2) return 0;

    const firstHalf = emotionalData.slice(0, Math.floor(emotionalData.length / 2));
    const secondHalf = emotionalData.slice(Math.floor(emotionalData.length / 2));

    const firstAvg = firstHalf.reduce((sum, score) => sum + score.mood_score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, score) => sum + score.mood_score, 0) / secondHalf.length;

    return (secondAvg - firstAvg) / emotionalData.length; // Normalized trend
  }

  private calculateResilienceScore(emotionalData: any[]): number {
    // Calculate how quickly the user recovers from negative mood events
    // For now, return a placeholder
    return 0.7;
  }

  private predictMoodAtTimeframe(emotionalData: any[], timeframe: number): number {
    // Simple linear trend prediction
    const recentData = emotionalData.slice(-7); // Last week
    const trend = this.calculateMoodTrend(recentData);
    const currentMood = recentData[recentData.length - 1].mood_score;

    return Math.max(1, Math.min(10, currentMood + trend * timeframe));
  }

  private identifyRiskFactorsForTimeframe(emotionalData: any[], timeframe: number): string[] {
    // Identify potential risk factors for the given timeframe
    return ['high_volatility', 'recent_negative_trend'];
  }

  private generateRecommendedActionsForTimeframe(emotionalData: any[], timeframe: number): string[] {
    // Generate context-appropriate recommendations
    return ['schedule_support_session', 'practice_mindfulness'];
  }

  private projectLongTermTrajectory(emotionalData: any[], timeframe: number): EmotionalModel['predictiveModel']['longTermProjections'][0]['projectedTrajectory'] {
    const trend = this.calculateMoodTrend(emotionalData);
    const volatility = this.calculateStandardDeviation(emotionalData.map(d => d.mood_score));

    if (Math.abs(trend) < 0.05 && volatility < 1) return 'stable';
    if (trend > 0.1) return 'improving';
    if (trend < -0.1 || volatility > 2) return 'high_risk';
    return 'declining';
  }

  private identifyKeyInfluences(emotionalData: any[], timeframe: number): string[] {
    return ['session_participation', 'daily_mood_logging'];
  }

  private identifyInterventionPoints(emotionalData: any[], timeframe: number): string[] {
    return ['week_4', 'month_3'];
  }

  private async performAnomalyDetection(emotionalData: any[]): Promise<PredictiveInsights['anomalyDetection']> {
    const currentAnomalies = this.detectCurrentAnomalies(emotionalData);
    const anomalyPatterns = this.identifyAnomalyPatterns(emotionalData);

    return {
      currentAnomalies,
      anomalyPatterns
    };
  }

  private detectCurrentAnomalies(emotionalData: any[]): PredictiveInsights['anomalyDetection']['currentAnomalies'] {
    // Simple anomaly detection based on standard deviations
    const recentData = emotionalData.slice(-7);
    const historicalData = emotionalData.slice(0, -7);

    if (historicalData.length < 7) return [];

    const historicalMean = historicalData.reduce((sum, d) => sum + d.mood_score, 0) / historicalData.length;
    const historicalStd = this.calculateStandardDeviation(historicalData.map(d => d.mood_score));

    return recentData
      .filter(data => Math.abs(data.mood_score - historicalMean) > this.ANOMALY_DETECTION_SENSITIVITY * historicalStd)
      .map(data => ({
        type: data.mood_score > historicalMean ? 'elevated_mood' : 'depressed_mood',
        severity: Math.abs(data.mood_score - historicalMean) / historicalStd,
        description: `Unusual mood deviation detected`,
        detectedAt: data.logged_at
      }));
  }

  private identifyAnomalyPatterns(emotionalData: any[]): PredictiveInsights['anomalyDetection']['anomalyPatterns'] {
    // Identify recurring anomaly patterns
    return [
      {
        pattern: 'weekend_mood_drop',
        frequency: 0.3,
        typicalTriggers: ['social_isolation', 'routine_disruption']
      }
    ];
  }

  private calculateCurrentRiskLevel(emotionalData: any[]): RiskProfile['currentRiskLevel'] {
    const recentData = emotionalData.slice(-7);
    const recentAvg = recentData.reduce((sum, d) => sum + d.mood_score, 0) / recentData.length;
    const volatility = this.calculateStandardDeviation(recentData.map(d => d.mood_score));

    if (recentAvg < 3 && volatility > 2) return 'critical';
    if (recentAvg < 4 || volatility > 1.5) return 'high';
    if (recentAvg < 5 || volatility > 1) return 'moderate';
    return 'low';
  }

  private identifyRiskFactors(emotionalData: any[]): RiskProfile['riskFactors'] {
    return [
      {
        factor: 'mood_volatility',
        level: this.calculateStandardDeviation(emotionalData.map(d => d.mood_score)) / 5,
        trend: 'stable',
        lastAssessed: new Date().toISOString()
      }
    ];
  }

  private identifyProtectiveFactors(emotionalData: any[]): RiskProfile['protectiveFactors'] {
    return [
      {
        factor: 'regular_sessions',
        strength: 0.8,
        trend: 'stable'
      }
    ];
  }

  private monitorCrisisIndicators(emotionalData: any[]): RiskProfile['crisisIndicators'] {
    const recentData = emotionalData.slice(-3);
    const recentAvg = recentData.reduce((sum, d) => sum + d.mood_score, 0) / recentData.length;

    return [
      {
        indicator: 'acute_mood_drop',
        threshold: 3,
        currentValue: recentAvg,
        status: recentAvg < 3 ? 'critical' : recentAvg < 5 ? 'elevated' : 'normal'
      }
    ];
  }

  private defineInterventionThresholds(emotionalData: any[]): RiskProfile['interventionThresholds'] {
    return [
      {
        threshold: 'crisis_intervention',
        value: 2.5,
        triggered: false
      }
    ];
  }

  private async getInterventionHistory(userId: string): Promise<InterventionRecord[]> {
    // Retrieve intervention history from database
    const adapter = db.getAdapter();

    const interventions = await adapter.query(`
      SELECT * FROM healing_guidance_interactions
      WHERE user_id = ? AND research_consent = true
      ORDER BY suggested_at DESC
      LIMIT 50
    `, [userId]);

    return interventions.map(int => ({
      id: int.id,
      timestamp: int.suggested_at,
      type: 'responsive',
      trigger: 'emotional_state_analysis',
      actions: [int.guidance_type],
      outcome: int.effectiveness_rating ? 'successful' : 'pending',
      effectiveness: int.effectiveness_rating || 0,
      followUpRequired: false
    }));
  }

  private calculateModelConfidence(emotionalData: any[]): number {
    const dataPoints = emotionalData.length;
    const timeSpan = emotionalData.length; // Assuming daily data
    const consistency = 1 - (this.calculateStandardDeviation(emotionalData.map(d => d.mood_score)) / 5);

    // Confidence based on data quantity, time span, and consistency
    return Math.min(0.95, (dataPoints / 100) * (timeSpan / 365) * consistency);
  }

  private async getExistingModel(userId: string): Promise<EmotionalModel | null> {
    const adapter = db.getAdapter();

    const result = await adapter.query(`
      SELECT * FROM emotional_models WHERE user_id = ?
    `, [userId]);

    if (result.length === 0) return null;

    return JSON.parse(result[0].model_data);
  }

  private modelNeedsUpdate(model: EmotionalModel): boolean {
    const lastUpdate = new Date(model.lastUpdated);
    const now = new Date();
    return (now.getTime() - lastUpdate.getTime()) > this.MODEL_UPDATE_INTERVAL;
  }

  private async gatherEmotionalData(userId: string): Promise<any[]> {
    const adapter = db.getAdapter();

    // Get all available emotional data for the user
    return await adapter.query(`
      SELECT
        el.*,
        s.id as session_id,
        pe.id as panic_event_id,
        crm.recovery_progress_score
      FROM emotion_logs el
      LEFT JOIN sessions s ON el.user_id = s.participant_id
        AND DATE(el.logged_at) = DATE(s.created_at)
      LEFT JOIN panic_events pe ON el.user_id = pe.user_id
        AND DATE(el.logged_at) = DATE(pe.triggered_at)
      LEFT JOIN clinical_recovery_metrics crm ON el.user_id = crm.user_id
        AND DATE(el.logged_at) = DATE(crm.calculated_at)
      WHERE el.user_id = ? AND el.research_consent = true
      ORDER BY el.logged_at ASC
    `, [userId]);
  }

  private async getRecentEmotionalData(userId: string, days: number): Promise<any[]> {
    const adapter = db.getAdapter();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await adapter.query(`
      SELECT * FROM emotion_logs
      WHERE user_id = ? AND logged_at >= ?
      ORDER BY logged_at DESC
    `, [userId, cutoffDate.toISOString()]);
  }

  private async cacheEmotionalModel(model: EmotionalModel): Promise<void> {
    const adapter = db.getAdapter();

    await adapter.query(`
      INSERT INTO emotional_models (user_id, model_data, last_updated)
      VALUES (?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET
        model_data = EXCLUDED.model_data,
        last_updated = EXCLUDED.last_updated
    `, [
      model.userId,
      JSON.stringify(model),
      model.lastUpdated
    ]);
  }

  private calculateMoodDeviation(currentMood: number, baseline: EmotionalBaseline): number {
    return (currentMood - baseline.averageMood) / baseline.moodVolatility;
  }

  private assessCurrentRiskLevel(deviation: number, riskProfile: RiskProfile): string {
    if (deviation < -2 || riskProfile.currentRiskLevel === 'critical') return 'critical';
    if (deviation < -1.5 || riskProfile.currentRiskLevel === 'high') return 'high';
    if (deviation < -1 || riskProfile.currentRiskLevel === 'moderate') return 'moderate';
    return 'low';
  }

  private generateImmediateActions(deviation: number, riskLevel: string, model: EmotionalModel): string[] {
    const actions = [];

    if (riskLevel === 'critical') {
      actions.push('immediate_crisis_intervention');
      actions.push('emergency_contact_notification');
    } else if (riskLevel === 'high') {
      actions.push('schedule_urgent_session');
      actions.push('breathing_exercise_suggestion');
    } else if (deviation < -0.5) {
      actions.push('mood_check_in');
      actions.push('support_circle_suggestion');
    }

    return actions;
  }

  private classifyEmotionalState(moodScore: number): string {
    if (moodScore >= 8) return 'excellent';
    if (moodScore >= 6) return 'good';
    if (moodScore >= 4) return 'fair';
    if (moodScore >= 2) return 'poor';
    return 'critical';
  }

  private generateTimeSeriesPrediction(data: any[], timeframe: number, model: EmotionalModel): number[] {
    // Simple exponential smoothing prediction
    const alpha = 0.3; // Smoothing factor
    const predictions = [];
    let currentPrediction = data[data.length - 1].mood_score;

    for (let i = 0; i < timeframe; i++) {
      // Add trend and seasonal components
      const trendComponent = model.patternAnalysis.stability.trendDirection === 'improving' ? 0.1 :
                           model.patternAnalysis.stability.trendDirection === 'declining' ? -0.1 : 0;

      currentPrediction = alpha * (currentPrediction + trendComponent) + (1 - alpha) * currentPrediction;
      currentPrediction = Math.max(1, Math.min(10, currentPrediction)); // Clamp to valid range

      predictions.push(currentPrediction);
    }

    return predictions;
  }

  private calculateConfidenceIntervals(predictions: number[], volatility: number): { upper: number[]; lower: number[] } {
    const confidenceMultiplier = 1.96; // 95% confidence interval

    return {
      upper: predictions.map(p => Math.min(10, p + confidenceMultiplier * volatility)),
      lower: predictions.map(p => Math.max(1, p - confidenceMultiplier * volatility))
    };
  }

  private identifyPredictionRiskFactors(predictions: number[], model: EmotionalModel): string[] {
    const risks = [];

    if (predictions.some(p => p < 3)) {
      risks.push('severe_mood_drop_predicted');
    }

    if (model.baselineProfile.moodVolatility > 2) {
      risks.push('high_volatility_risk');
    }

    return risks;
  }

  private recommendPredictiveInterventions(predictions: number[], riskFactors: string[], model: EmotionalModel): string[] {
    const interventions = [];

    if (riskFactors.includes('severe_mood_drop_predicted')) {
      interventions.push('preventive_counseling');
      interventions.push('daily_mood_monitoring');
    }

    if (model.baselineProfile.recoveryRate > 5) {
      interventions.push('resilience_building_program');
    }

    return interventions;
  }

  private detectMoodAnomalies(recentData: any[], baseline: EmotionalBaseline): { anomalies: any[], score: number } {
    const anomalies = [];
    let anomalyScore = 0;

    recentData.forEach(data => {
      const deviation = Math.abs(data.mood_score - baseline.averageMood) / baseline.moodVolatility;

      if (deviation > this.ANOMALY_DETECTION_SENSITIVITY) {
        anomalies.push({
          type: 'mood_anomaly',
          severity: deviation / 5, // Normalize to 0-1
          description: `Mood score ${data.mood_score} deviates significantly from baseline`,
          timestamp: data.logged_at,
          confidence: Math.min(0.95, deviation / 3)
        });

        anomalyScore += deviation / 5;
      }
    });

    return { anomalies, score: anomalyScore / recentData.length };
  }

  private detectPatternAnomalies(recentData: any[], patterns: EmotionalPatterns): { anomalies: any[], score: number } {
    // Detect deviations from established patterns
    return { anomalies: [], score: 0 }; // Placeholder
  }

  private detectTriggerAnomalies(recentData: any[], triggers: EmotionalPatterns['triggers']): { anomalies: any[], score: number } {
    // Detect unusual trigger patterns
    return { anomalies: [], score: 0 }; // Placeholder
  }

  private getSeasonName(month: number): string {
    if (month >= 11 || month <= 1) return 'winter';
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    return 'fall';
  }
}

export const longTermEmotionalModeling = LongTermEmotionalModelingSystem.getInstance();
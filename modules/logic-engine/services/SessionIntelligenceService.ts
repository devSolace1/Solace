'use client';

import { createClient } from '@supabase/supabase-js';
import type {
  SessionIntelligence,
  ConversationPattern,
  EmotionalState
} from '../types';

export class SessionIntelligenceService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Analyze session intelligence for real-time recommendations
   */
  async analyzeSession(sessionId: string): Promise<SessionIntelligence> {
    const pattern = await this.analyzeConversationPattern(sessionId);
    const fatigue = await this.detectFatigueIndicators(pattern);
    const continuity = this.calculateContinuityScore(pattern);
    const recommendations = this.generateRecommendations(pattern, fatigue, continuity);

    return {
      sessionId,
      continuityScore: continuity,
      fatigueIndicators: fatigue,
      recommendations,
      patterns: {
        veryLongSession: pattern.duration > 120, // 2+ hours
        highEmotionalIntensity: pattern.emotionalIntensity > 0.7,
        rapidMessageBursts: this.detectRapidBursts(pattern),
        repetitiveTopics: await this.detectRepetitiveTopics(sessionId)
      }
    };
  }

  /**
   * Analyze conversation patterns in a session
   */
  private async analyzeConversationPattern(sessionId: string): Promise<ConversationPattern> {
    const { data: messages } = await this.supabase
      .from('messages')
      .select('sender_id, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!messages || messages.length === 0) {
      return {
        sessionId,
        userId: '',
        messageCount: 0,
        averageResponseTime: 0,
        emotionalIntensity: 0,
        duration: 0,
        messageFrequency: 0,
        lastActivity: new Date()
      };
    }

    const { data: session } = await this.supabase
      .from('sessions')
      .select('participant_id, created_at, ended_at')
      .eq('id', sessionId)
      .single();

    const userId = session?.participant_id || '';
    const startTime = new Date(session?.created_at || messages[0].created_at);
    const endTime = session?.ended_at ? new Date(session.ended_at) : new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

    // Calculate response times
    const responseTimes: number[] = [];
    let lastUserMessage: Date | null = null;

    messages.forEach(msg => {
      if (msg.sender_id === userId) {
        lastUserMessage = new Date(msg.created_at);
      } else if (lastUserMessage) {
        const responseTime = (new Date(msg.created_at).getTime() - lastUserMessage.getTime()) / (1000 * 60);
        responseTimes.push(responseTime);
      }
    });

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // Calculate emotional intensity (simplified sentiment analysis)
    const emotionalIntensity = this.calculateEmotionalIntensity(messages);

    // Calculate message frequency
    const messageFrequency = duration > 0 ? messages.length / (duration / 60) : 0; // messages per hour

    return {
      sessionId,
      userId,
      messageCount: messages.length,
      averageResponseTime,
      emotionalIntensity,
      duration,
      messageFrequency,
      lastActivity: endTime
    };
  }

  /**
   * Detect fatigue indicators in the conversation
   */
  private async detectFatigueIndicators(pattern: ConversationPattern): Promise<SessionIntelligence['fatigueIndicators']> {
    return {
      longSession: pattern.duration > 90, // 90+ minutes
      rapidBursts: this.detectRapidBursts(pattern),
      emotionalIntensity: pattern.emotionalIntensity,
      messageVolume: pattern.messageCount > 50 ? 1 : pattern.messageCount / 50
    };
  }

  /**
   * Calculate continuity score based on conversation flow
   */
  private calculateContinuityScore(pattern: ConversationPattern): number {
    let score = 0;

    // Response time consistency (lower variance = higher continuity)
    if (pattern.averageResponseTime < 30) score += 0.3; // Quick responses
    else if (pattern.averageResponseTime < 60) score += 0.2;
    else score += 0.1;

    // Message frequency (balanced conversation)
    if (pattern.messageFrequency > 0.5 && pattern.messageFrequency < 2) score += 0.3;
    else if (pattern.messageFrequency > 0.2 && pattern.messageFrequency < 3) score += 0.2;
    else score += 0.1;

    // Session duration (not too short or long)
    if (pattern.duration > 10 && pattern.duration < 120) score += 0.4;
    else if (pattern.duration > 5 && pattern.duration < 180) score += 0.2;

    return Math.min(1, score);
  }

  /**
   * Generate intelligent recommendations based on analysis
   */
  private generateRecommendations(
    pattern: ConversationPattern,
    fatigue: SessionIntelligence['fatigueIndicators'],
    continuity: number
  ): SessionIntelligence['recommendations'] {
    return {
      suggestCooldown: fatigue.longSession || fatigue.emotionalIntensity > 0.8,
      suggestBreak: pattern.duration > 60 && continuity < 0.3,
      escalateSupport: fatigue.emotionalIntensity > 0.9 || pattern.messageCount > 100,
      counselorSwitch: continuity < 0.2 && pattern.duration > 45
    };
  }

  /**
   * Calculate emotional intensity from message content
   */
  private calculateEmotionalIntensity(messages: any[]): number {
    if (messages.length === 0) return 0;

    const emotionalWords = {
      high: ['crisis', 'panic', 'desperate', 'breaking', 'can\'t', 'worst', 'hate', 'angry', 'furious', 'devastated'],
      medium: ['sad', 'hurt', 'pain', 'worried', 'scared', 'confused', 'lost', 'overwhelmed', 'stressed'],
      low: ['okay', 'fine', 'better', 'hope', 'grateful', 'thank', 'good', 'calm', 'peace']
    };

    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();

      emotionalWords.high.forEach(word => {
        if (content.includes(word)) highCount++;
      });
      emotionalWords.medium.forEach(word => {
        if (content.includes(word)) mediumCount++;
      });
      emotionalWords.low.forEach(word => {
        if (content.includes(word)) lowCount++;
      });
    });

    const totalEmotionalWords = highCount + mediumCount + lowCount;
    if (totalEmotionalWords === 0) return 0.5; // Neutral

    // Weight: high = 1.0, medium = 0.6, low = 0.3
    const weightedSum = (highCount * 1.0) + (mediumCount * 0.6) + (lowCount * 0.3);
    return Math.min(1, weightedSum / totalEmotionalWords);
  }

  /**
   * Detect rapid message bursts that might indicate distress
   */
  private detectRapidBursts(pattern: ConversationPattern): boolean {
    // This would require more detailed message timing analysis
    // For now, use message frequency as a proxy
    return pattern.messageFrequency > 3; // More than 3 messages per hour
  }

  /**
   * Detect repetitive topics in conversation
   */
  private async detectRepetitiveTopics(sessionId: string): Promise<boolean> {
    const { data: messages } = await this.supabase
      .from('messages')
      .select('content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!messages || messages.length < 5) return false;

    // Simple keyword frequency analysis
    const keywords = ['same', 'again', 'repeat', 'over', 'still', 'always'];
    let repetitionCount = 0;

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      keywords.forEach(keyword => {
        if (content.includes(keyword)) repetitionCount++;
      });
    });

    return repetitionCount > messages.length * 0.1; // 10% of messages contain repetition keywords
  }

  /**
   * Get session health metrics for monitoring
   */
  async getSessionHealthMetrics(sessionId: string): Promise<{
    health: 'good' | 'concerning' | 'critical';
    metrics: {
      continuity: number;
      fatigue: number;
      engagement: number;
    };
    alerts: string[];
  }> {
    const intelligence = await this.analyzeSession(sessionId);

    const fatigue = (
      (intelligence.fatigueIndicators.longSession ? 1 : 0) +
      (intelligence.fatigueIndicators.rapidBursts ? 1 : 0) +
      intelligence.fatigueIndicators.emotionalIntensity +
      intelligence.fatigueIndicators.messageVolume
    ) / 4;

    const engagement = intelligence.continuityScore;
    const overallHealth = fatigue > 0.7 ? 'critical' : fatigue > 0.4 ? 'concerning' : 'good';

    const alerts: string[] = [];
    if (intelligence.recommendations.suggestCooldown) alerts.push('Consider suggesting a cooldown period');
    if (intelligence.recommendations.suggestBreak) alerts.push('Session may benefit from a short break');
    if (intelligence.recommendations.escalateSupport) alerts.push('Consider escalating to additional support');
    if (intelligence.recommendations.counselorSwitch) alerts.push('Consider counselor reassignment');

    return {
      health: overallHealth,
      metrics: {
        continuity: intelligence.continuityScore,
        fatigue,
        engagement
      },
      alerts
    };
  }
}
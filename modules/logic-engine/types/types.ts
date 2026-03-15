'use client';

// Core types for V6 Logic Engine
export type EmotionalState = 'stable' | 'recovering' | 'distressed' | 'high_risk';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type SessionPriority = 'normal' | 'high' | 'urgent' | 'critical';

export type CounselorAvailability = 'available' | 'busy' | 'unavailable' | 'offline';

export type ConversationPattern = {
  sessionId: string;
  userId: string;
  messageCount: number;
  averageResponseTime: number;
  emotionalIntensity: number;
  duration: number;
  messageFrequency: number;
  lastActivity: Date;
};

export type CounselorLoad = {
  counselorId: string;
  activeSessions: number;
  totalSessionsToday: number;
  averageSessionDuration: number;
  specialization: string[];
  availability: CounselorAvailability;
  lastActive: Date;
};

export type EmotionalStateModel = {
  userId: string;
  currentState: EmotionalState;
  confidence: number; // 0-1
  signals: {
    dailyMoodScore: number;
    messageSentimentTrend: number; // -1 to 1
    chatFrequency: number; // messages per day
    panicEvents: number;
    conversationDuration: number; // average minutes
    sessionStreak: number;
    lastMoodCheck: Date | null;
  };
  trends: {
    moodImprovement: number; // percentage change
    activityIncrease: number; // percentage change
    riskIndicators: string[];
  };
  lastUpdated: Date;
};

export type SessionIntelligence = {
  sessionId: string;
  continuityScore: number; // 0-1, how continuous the conversation flow is
  fatigueIndicators: {
    longSession: boolean;
    rapidBursts: boolean;
    emotionalIntensity: number;
    messageVolume: number;
  };
  recommendations: {
    suggestCooldown: boolean;
    suggestBreak: boolean;
    escalateSupport: boolean;
    counselorSwitch: boolean;
  };
  patterns: {
    veryLongSession: boolean;
    highEmotionalIntensity: boolean;
    rapidMessageBursts: boolean;
    repetitiveTopics: boolean;
  };
};

export type PanicEscalationLevel = 1 | 2 | 3;

export type PanicAlert = {
  id: string;
  sessionId: string;
  userId: string;
  level: PanicEscalationLevel;
  triggeredBy: 'user_button' | 'auto_detection';
  emotionalState: EmotionalState;
  riskLevel: RiskLevel;
  assignedCounselor?: string;
  status: 'active' | 'assigned' | 'resolved';
  createdAt: Date;
  resolvedAt?: Date;
};

export type MatchingCriteria = {
  userId: string;
  emotionalState: EmotionalState;
  riskLevel: RiskLevel;
  previousCounselors: string[];
  preferredSpecializations: string[];
  urgency: SessionPriority;
  sessionHistory: {
    totalSessions: number;
    averageRating: number;
    lastSessionDate: Date | null;
  };
};

export type CounselorMatch = {
  counselorId: string;
  score: number; // 0-1
  reasons: string[];
  availability: CounselorAvailability;
  specialization: string[];
  currentLoad: number;
};

export type PlatformMetrics = {
  activeUsers: number;
  activeSessions: number;
  averageSessionDuration: number;
  panicAlertsToday: number;
  counselorUtilization: number;
  systemHealth: {
    databaseLatency: number;
    realtimeConnections: number;
    errorRate: number;
  };
};
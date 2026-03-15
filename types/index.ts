export type UserRole = 'participant' | 'counselor' | 'moderator';

export type SolaceUser = {
  userId: string;
  role: UserRole;
  recoveryKey?: string;
};

export type SolaceSession = SolaceUser;

export type SessionStatus = 'waiting' | 'active' | 'ended';

export type EmotionalState = {
  currentMood?: string;
  stressLevel?: number;
  lastCheckIn?: Date;
};

export type PanicState = {
  isActive: boolean;
  triggeredAt?: Date;
  escalated: boolean;
};

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export type ChatMessage = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  isOwn?: boolean;
  isFlagged?: boolean;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'failed';
};

export type JournalEntry = {
  id: string;
  content: string;
  createdAt: string;
  visibleToCounselor: boolean;
};

export type MoodLog = {
  id: string;
  mood: string;
  stressLevel?: number;
  note?: string;
  createdAt: string;
};

export type Report = {
  id: string;
  type: 'harassment' | 'boundary' | 'safety' | 'other';
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
};

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'destructive';

export type CounselorAvailability = {
  counselorId: string;
  activeSessions: number;
  isAvailable: boolean;
};

export type EmotionalSignal = {
  id: string;
  sessionId: string;
  messageId: string;
  sadnessScore: number;
  distressScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'crisis';
  createdAt: string;
};

export type CrisisAlert = {
  id: string;
  sessionId: string;
  userId: string;
  alertType: 'self_harm' | 'suicidal' | 'despair' | 'panic';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt?: string;
};

export type ModerationFlag = {
  id: string;
  messageId: string;
  sessionId: string;
  flagType: 'romantic' | 'sexual' | 'predatory' | 'spam';
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'actioned';
  createdAt: string;
};

export type SupportRoom = {
  id: string;
  name: string;
  description?: string;
  category: 'heartbreak' | 'loneliness' | 'stress' | 'general';
  isActive: boolean;
  isModerated?: boolean;
  moderatorId?: string;
  maxParticipants?: number;
  rules?: string;
  guidelines?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
};

export type SupportRoomMessage = {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  isFlagged: boolean;
  createdAt: string;
};

export type MatchCriteria = {
  emotionalSeverity: 'low' | 'medium' | 'high';
  preferences?: string[];
};

// ===========================================
// V3.5 TYPES
// ===========================================

export type NotificationType =
  | 'counselor_connected'
  | 'new_message'
  | 'session_reminder'
  | 'daily_checkin'
  | 'panic_response'
  | 'new_user_waiting'
  | 'panic_alert'
  | 'session_assignment'
  | 'abuse_report'
  | 'crisis_alert'
  | 'system_issue';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  priority: NotificationPriority;
  createdAt: string;
  expiresAt?: string;
};

export type ModerationFlagType =
  | 'romantic'
  | 'sexual'
  | 'predatory'
  | 'spam'
  | 'harassment'
  | 'self_harm'
  | 'suicide'
  | 'other';

export type ModerationFlagSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ModerationFlagStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

export type ModerationFlag = {
  id: string;
  messageId?: string;
  sessionId: string;
  flaggedBy: string;
  flagType: ModerationFlagType;
  severity: ModerationFlagSeverity;
  reason?: string;
  status: ModerationFlagStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  actionTaken?: string;
  createdAt: string;
};

export type AdminActionType =
  | 'suspend_user'
  | 'suspend_counselor'
  | 'resolve_flag'
  | 'dismiss_flag'
  | 'escalate_crisis'
  | 'system_maintenance'
  | 'other';

export type AdminAction = {
  id: string;
  adminId: string;
  actionType: AdminActionType;
  targetUserId?: string;
  targetSessionId?: string;
  details?: string;
  metadata?: Record<string, any>;
  createdAt: string;
};

export type AnalyticsEventType =
  | 'session_started'
  | 'session_ended'
  | 'message_sent'
  | 'mood_logged'
  | 'journal_entry'
  | 'panic_triggered'
  | 'page_view'
  | 'feature_used';

export type AnalyticsEvent = {
  id: string;
  eventType: AnalyticsEventType;
  anonymousData?: Record<string, any>;
  createdAt: string;
};

export type SystemHealthComponent =
  | 'database'
  | 'realtime'
  | 'api'
  | 'frontend'
  | 'notifications';

export type SystemHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'maintenance';

export type SystemHealth = {
  id: string;
  component: SystemHealthComponent;
  status: SystemHealthStatus;
  message?: string;
  metrics?: Record<string, any>;
  createdAt: string;
};

// ===========================================
// VERSION 4 TYPES
// ===========================================

export type CrisisAlertType =
  | 'self_harm'
  | 'suicidal_ideation'
  | 'extreme_distress'
  | 'panic_attack'
  | 'emotional_crisis';

export type CrisisAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type CrisisAlertStatus = 'active' | 'escalated' | 'resolved' | 'dismissed';

export type CrisisAlert = {
  id: string;
  sessionId: string;
  userId: string;
  alertType: CrisisAlertType;
  severity: CrisisAlertSeverity;
  status: CrisisAlertStatus;
  detectionMethod: 'keyword_pattern' | 'sentiment_analysis' | 'manual_report' | 'behavioral_pattern';
  riskIndicators?: Record<string, any>;
  assignedCounselorId?: string;
  moderatorNotified: boolean;
  createdAt: string;
  escalatedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
};

export type SupportRoomCategory =
  | 'heartbreak_recovery'
  | 'loneliness_support'
  | 'stress_management'
  | 'grief_support'
  | 'relationship_advice'
  | 'emotional_wellness';

export type SupportRoom = {
  id: string;
  name: string;
  description: string;
  category: SupportRoomCategory;
  isActive: boolean;
  isModerated: boolean;
  moderatorId?: string;
  maxParticipants: number;
  rules?: string;
  guidelines?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
};

export type SupportRoomMessage = {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  contentHash: string;
  isFlagged: boolean;
  flagReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  moderationAction?: 'approved' | 'edited' | 'removed' | 'banned';
  replyToId?: string;
  createdAt: string;
  editedAt?: string;
  metadata?: Record<string, any>;
};

export type CounselorVerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

export type CounselorProfile = {
  id: string;
  userId: string;
  verificationStatus: CounselorVerificationStatus;
  trainingCompleted: boolean;
  trainingModules: string[];
  specializationAreas: string[];
  yearsExperience?: number;
  certifications: string[];
  backgroundCheckStatus?: 'pending' | 'approved' | 'rejected';
  emergencyTraining: boolean;
  crisisTraining: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
};

export type CounselorStats = {
  id: string;
  counselorId: string;
  periodStart: string;
  periodEnd: string;
  sessionsHandled: number;
  avgResponseTimeSeconds?: number;
  totalResponseTimeSeconds: number;
  messagesSent: number;
  messagesReceived: number;
  sessionsCompleted: number;
  sessionsAbandoned: number;
  crisisAlertsHandled: number;
  avgSessionDurationMinutes?: number;
  createdAt: string;
};

export type CounselorFeedback = {
  id: string;
  counselorId: string;
  sessionId: string;
  participantId: string;
  helpfulnessRating?: number; // 1-5
  responseQualityRating?: number; // 1-5
  empathyRating?: number; // 1-5
  overallRating?: number; // 1-5
  sessionCompletionRating?: number; // 1-5
  feedbackText?: string;
  isAnonymous: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
};

export type ResearchMetricType =
  | 'mood_trend'
  | 'session_duration'
  | 'conversation_frequency'
  | 'emotional_pattern'
  | 'engagement_level'
  | 'recovery_progress'
  | 'support_circle_participation';

export type ResearchMetric = {
  id: string;
  studyId: string;
  metricType: ResearchMetricType;
  anonymousParticipantId: string;
  data: Record<string, any>;
  collectionDate: string;
  approvedByInstitution: boolean;
  dataRetentionDays: number;
  createdAt: string;
  expiresAt: string;
};

export type CrisisResourceCategory =
  | 'coping_strategies'
  | 'breathing_exercises'
  | 'stress_reduction'
  | 'self_care'
  | 'emergency_contacts'
  | 'professional_help'
  | 'peer_support';

export type CrisisResourceContentType =
  | 'article'
  | 'guide'
  | 'exercise'
  | 'video'
  | 'audio'
  | 'infographic';

export type CrisisResourceAccessLevel = 'public' | 'authenticated' | 'crisis_only';

export type CrisisResource = {
  id: string;
  title: string;
  category: CrisisResourceCategory;
  contentType: CrisisResourceContentType;
  content: string;
  summary?: string;
  tags: string[];
  isActive: boolean;
  accessLevel: CrisisResourceAccessLevel;
  viewCount: number;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
};

export type RateLimitActionType =
  | 'message_send'
  | 'session_start'
  | 'api_request'
  | 'login_attempt';

export type RateLimit = {
  id: string;
  identifier: string;
  actionType: RateLimitActionType;
  windowStart: string;
  requestCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SpamPatternType =
  | 'content_hash'
  | 'ip_address'
  | 'user_behavior'
  | 'message_pattern';

export type SpamPatternSeverity = 'low' | 'medium' | 'high';

export type SpamPattern = {
  id: string;
  patternType: SpamPatternType;
  patternValue: string;
  severity: SpamPatternSeverity;
  isActive: boolean;
  detectionCount: number;
  lastDetectedAt?: string;
  createdAt: string;
};

export type EncryptionKey = {
  id: string;
  sessionId: string;
  keyVersion: number;
  publicKey: string;
  encryptedPrivateKey: string;
  algorithm: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
};

export type PushSubscription = {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
};

export type PlatformMetricPeriod = 'minute' | 'hour' | 'day' | 'week' | 'month';

export type PlatformMetric = {
  id: string;
  metricName: string;
  metricValue: number;
  metricUnit?: string;
  collectionPeriod: PlatformMetricPeriod;
  periodStart: string;
  periodEnd: string;
  dimensions?: Record<string, any>;
  createdAt: string;
};

// Service Types
export type CrisisDetectionResult = {
  detected: boolean;
  alertType?: CrisisAlertType;
  severity?: CrisisAlertSeverity;
  indicators: Record<string, any>;
};

export type RateLimitResult = {
  allowed: boolean;
  remainingRequests?: number;
  resetTime?: string;
};

export type SpamCheckResult = {
  isSpam: boolean;
  severity?: SpamPatternSeverity;
  reason?: string;
};

export type CounselorReputation = {
  counselorId: string;
  reputationScore: number; // 0-100
  totalRatings: number;
  avgRatings: {
    helpfulness: number;
    quality: number;
    empathy: number;
    completion: number;
  };
  lastCalculated: string;
};

// API Request/Response Types
export type CrisisAlertCreateRequest = {
  sessionId: string;
  alertType: CrisisAlertType;
  detectionMethod: string;
  riskIndicators?: Record<string, any>;
};

export type CrisisAlertUpdateRequest = {
  status?: CrisisAlertStatus;
  assignedCounselorId?: string;
  resolutionNotes?: string;
};

export type SupportRoomCreateRequest = {
  name: string;
  description: string;
  category: SupportRoomCategory;
  maxParticipants?: number;
  rules?: string;
  guidelines?: Record<string, any>;
};

export type CounselorFeedbackSubmitRequest = {
  sessionId: string;
  counselorId: string;
  helpfulnessRating?: number;
  responseQualityRating?: number;
  empathyRating?: number;
  overallRating?: number;
  sessionCompletionRating?: number;
  feedbackText?: string;
};

export type ResearchDataExportRequest = {
  studyId: string;
  metricTypes?: ResearchMetricType[];
  dateRange?: {
    start: string;
    end: string;
  };
  format: 'json' | 'csv';
};

export type ResearchDataExportResponse = {
  studyId: string;
  exportedAt: string;
  recordCount: number;
  data: any[] | string; // JSON array or CSV string
};

export type PlatformHealthStatus = {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    database: 'healthy' | 'degraded' | 'unhealthy';
    api: 'healthy' | 'degraded' | 'unhealthy';
    realtime: 'healthy' | 'degraded' | 'unhealthy';
    notifications: 'healthy' | 'degraded' | 'unhealthy';
  };
  metrics: {
    activeUsers: number;
    activeSessions: number;
    pendingCrisisAlerts: number;
    responseTime: number;
  };
  lastChecked: string;
};
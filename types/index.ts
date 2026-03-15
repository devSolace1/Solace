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
  moderatorId?: string;
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

// UI Component Types
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type CardVariant = 'default' | 'elevated' | 'bordered' | 'minimal';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

export type AnimationType =
  | 'fadeIn'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'scaleIn'
  | 'bounceIn';
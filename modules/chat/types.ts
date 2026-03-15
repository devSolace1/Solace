// Chat Module Types
export interface ChatSession {
  id: string;
  participant_id: string;
  counselor_id?: string;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  started_at: string;
  ended_at?: string;
  priority: 'normal' | 'high' | 'critical';
  risk_indicators?: Record<string, any>;
  last_message_at?: string;
  message_count: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string;
  sender_role: 'user' | 'counselor' | 'system';
  content: string;
  message_type: 'text' | 'system' | 'emotion' | 'typing';
  created_at: string;
  is_deleted: boolean;
  metadata?: Record<string, any>;
}

export interface ChatParticipant {
  user_id: string;
  role: 'user' | 'counselor';
  joined_at: string;
  last_seen: string;
  is_typing: boolean;
}

export interface ChatConnection {
  session_id: string;
  user_id: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  last_ping: number;
  reconnect_attempts: number;
}

export interface TypingIndicator {
  session_id: string;
  user_id: string;
  is_typing: boolean;
  timestamp: number;
}
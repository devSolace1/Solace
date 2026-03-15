import { createClient } from '@supabase/supabase-js';
import type { ChatSession, ChatMessage, ChatParticipant, ChatConnection, TypingIndicator } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export class ChatService {
  private supabase;
  private connections: Map<string, ChatConnection> = new Map();
  private channels: Map<string, RealtimeChannel> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Create a new chat session
   */
  async createSession(participantId: string, priority: 'normal' | 'high' | 'critical' = 'normal'): Promise<ChatSession> {
    const { data: session, error } = await this.supabase
      .from('sessions')
      .insert({
        participant_id: participantId,
        status: 'waiting',
        priority,
        started_at: new Date().toISOString(),
        message_count: 0
      })
      .select()
      .single();

    if (error) throw error;

    // Initialize connection tracking
    this.connections.set(session.id, {
      session_id: session.id,
      user_id: participantId,
      status: 'connecting',
      last_ping: Date.now(),
      reconnect_attempts: 0
    });

    return session;
  }

  /**
   * Join an existing session (for counselors)
   */
  async joinSession(sessionId: string, counselorId: string): Promise<ChatSession> {
    const { data: session, error } = await this.supabase
      .from('sessions')
      .update({
        counselor_id: counselorId,
        status: 'active'
      })
      .eq('id', sessionId)
      .eq('status', 'waiting')
      .select()
      .single();

    if (error) throw error;

    // Update connection
    const connection = this.connections.get(sessionId);
    if (connection) {
      connection.status = 'connected';
      connection.last_ping = Date.now();
    }

    return session;
  }

  /**
   * Send a message
   */
  async sendMessage(sessionId: string, senderId: string, content: string, messageType: string = 'text'): Promise<ChatMessage> {
    const { data: message, error } = await this.supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        sender_id: senderId,
        content,
        message_type: messageType,
        is_deleted: false
      })
      .select()
      .single();

    if (error) throw error;

    // Update session last message timestamp and count
    await this.supabase
      .from('sessions')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: this.supabase.raw('message_count + 1')
      })
      .eq('id', sessionId);

    return message;
  }

  /**
   * Get session messages with pagination
   */
  async getMessages(sessionId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    const { data: messages, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return messages || [];
  }

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw error;

    // Clean up connection
    this.cleanupSession(sessionId);
  }

  /**
   * Set up real-time subscriptions for a session
   */
  setupRealtimeSession(sessionId: string, onMessage: (message: ChatMessage) => void, onTyping: (typing: TypingIndicator) => void): () => void {
    const channel = this.supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          onMessage(payload.new as ChatMessage);
        }
      )
      .on(
        'presence',
        { event: 'sync' },
        () => {
          const presenceState = channel.presenceState();
          // Handle presence updates for typing indicators
        }
      )
      .subscribe();

    this.channels.set(sessionId, channel);

    // Set up connection health monitoring
    this.startConnectionMonitoring(sessionId);

    // Return cleanup function
    return () => {
      this.cleanupSession(sessionId);
    };
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(sessionId: string, userId: string, isTyping: boolean): Promise<void> {
    const channel = this.channels.get(sessionId);
    if (channel) {
      await channel.track({
        user_id: userId,
        is_typing: isTyping,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Monitor connection health
   */
  private startConnectionMonitoring(sessionId: string): void {
    const monitor = () => {
      const connection = this.connections.get(sessionId);
      if (!connection) return;

      const now = Date.now();
      const timeSinceLastPing = now - connection.last_ping;

      // If no ping for 30 seconds, attempt reconnect
      if (timeSinceLastPing > 30000) {
        this.attemptReconnect(sessionId);
      } else {
        // Schedule next check
        const timeout = setTimeout(monitor, 10000); // Check every 10 seconds
        this.reconnectTimeouts.set(sessionId, timeout);
      }
    };

    monitor();
  }

  /**
   * Attempt to reconnect a session
   */
  private async attemptReconnect(sessionId: string): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection || connection.reconnect_attempts >= 5) {
      // Give up after 5 attempts
      connection.status = 'disconnected';
      return;
    }

    connection.status = 'reconnecting';
    connection.reconnect_attempts++;

    try {
      // Reinitialize the channel
      const channel = this.channels.get(sessionId);
      if (channel) {
        await channel.subscribe();
        connection.status = 'connected';
        connection.last_ping = Date.now();
        connection.reconnect_attempts = 0;
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
      // Schedule another attempt
      setTimeout(() => this.attemptReconnect(sessionId), 5000);
    }
  }

  /**
   * Clean up session resources
   */
  private cleanupSession(sessionId: string): void {
    // Remove channel
    const channel = this.channels.get(sessionId);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(sessionId);
    }

    // Clear timeouts
    const timeout = this.reconnectTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(sessionId);
    }

    // Remove connection
    this.connections.delete(sessionId);
  }

  /**
   * Get active sessions for counselors
   */
  async getActiveSessions(counselorId?: string): Promise<ChatSession[]> {
    let query = this.supabase
      .from('sessions')
      .select('*')
      .in('status', ['waiting', 'active'])
      .order('priority', { ascending: false })
      .order('started_at', { ascending: true });

    if (counselorId) {
      query = query.eq('counselor_id', counselorId);
    }

    const { data: sessions, error } = await query;
    if (error) throw error;
    return sessions || [];
  }

  /**   * Get user's chat sessions
   */
  async getUserSessions(userId: string, limit: number = 10): Promise<ChatSession[]> {
    const { data: sessions, error } = await this.supabase
      .from('sessions')
      .select(`
        id,
        participant_id,
        counselor_id,
        status,
        priority,
        started_at,
        ended_at,
        created_at,
        updated_at,
        message_count,
        messages(count)
      `)
      .eq('participant_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return sessions.map((s: any) => ({
      ...s,
      messageCount: s.messages?.[0]?.count || 0,
    }));
  }

  /**   * Get session statistics
   */
  async getSessionStats(userId: string): Promise<{
    total_sessions: number;
    active_sessions: number;
    completed_sessions: number;
    average_duration: number;
  }> {
    const { data: stats, error } = await this.supabase
      .rpc('get_user_session_stats', { user_id: userId });

    if (error) throw error;
    return stats;
  }
}
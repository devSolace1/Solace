import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatService } from '../services/ChatService';
import type { ChatSession, ChatMessage, TypingIndicator } from '../types';

const chatService = new ChatService();

export function useChatSession(sessionId: string | null) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadSession();
      setupRealtime();
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [sessionId]);

  const loadSession = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      // Load session data
      const { data: sessionData, error: sessionError } = await chatService.supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Load messages
      const sessionMessages = await chatService.getMessages(sessionId);
      setMessages(sessionMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    if (!sessionId) return;

    const cleanup = chatService.setupRealtimeSession(
      sessionId,
      (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
      },
      (typing) => {
        // Handle typing indicators
        console.log('Typing:', typing);
      }
    );

    cleanupRef.current = cleanup;
  };

  const sendMessage = useCallback(async (content: string, messageType: string = 'text') => {
    if (!sessionId || !session) return;

    try {
      const message = await chatService.sendMessage(sessionId, session.participant_id, content, messageType);
      // Message will be added via real-time subscription
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [sessionId, session]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      await chatService.endSession(sessionId);
      setSession(prev => prev ? { ...prev, status: 'completed' } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session');
    }
  }, [sessionId]);

  return {
    session,
    messages,
    loading,
    error,
    sendMessage,
    endSession
  };
}

export function useChatList(userId: string | null, userRole: 'user' | 'counselor' | 'admin') {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const activeSessions = await chatService.getActiveSessions(
        userRole === 'counselor' ? userId : undefined
      );
      setSessions(activeSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    loading,
    refresh: loadSessions
  };
}

export function useTypingIndicator(sessionId: string, userId: string) {
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsTyping(true);
    chatService.sendTypingIndicator(sessionId, userId, true);

    // Stop typing after 3 seconds of inactivity
    timeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [sessionId, userId]);

  const stopTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsTyping(false);
    chatService.sendTypingIndicator(sessionId, userId, false);
  }, [sessionId, userId]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isTyping,
    startTyping,
    stopTyping
  };
}

export function useChatStats(userId: string | null) {
  const [stats, setStats] = useState({
    total_sessions: 0,
    active_sessions: 0,
    completed_sessions: 0,
    average_duration: 0
  });
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const userStats = await chatService.getSessionStats(userId);
      setStats(userStats);
    } catch (error) {
      console.error('Failed to load chat stats:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    refresh: loadStats
  };
}

export function useUserSessions(userId: string | null, limit: number = 10) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    try {
      const userSessions = await chatService.getUserSessions(userId, limit);
      setSessions(userSessions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user sessions';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    loading,
    error,
    refresh: loadSessions
  };
}
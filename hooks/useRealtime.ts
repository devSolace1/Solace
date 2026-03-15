import { useEffect, useRef } from 'react';
import { RealtimeService } from '../services/realtime';
import { useSolaceStore } from '../lib/store';
import type { ChatMessage } from '../types';

export function useRealtime(sessionId?: string) {
  const { addMessage, setTyping, setConnectionStatus } = useSolaceStore();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    setConnectionStatus('connecting');

    const cleanup = RealtimeService.subscribeToMessages(
      sessionId,
      (message: ChatMessage) => {
        addMessage(message);
        setConnectionStatus('connected');
      },
      (userId: string, isTyping: boolean) => {
        setTyping(userId, isTyping);
      }
    );

    cleanupRef.current = cleanup;

    // Simulate connection established
    setTimeout(() => setConnectionStatus('connected'), 1000);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      setConnectionStatus('disconnected');
    };
  }, [sessionId, addMessage, setTyping, setConnectionStatus]);

  const sendTyping = (userId: string, isTyping: boolean) => {
    if (sessionId) {
      RealtimeService.sendTyping(sessionId, userId, isTyping);
    }
  };

  const reconnect = async () => {
    setConnectionStatus('reconnecting');
    await RealtimeService.reconnect();
    // Re-subscription would happen in the useEffect
  };

  return {
    sendTyping,
    reconnect,
  };
}
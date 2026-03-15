import { supabase } from '../lib/supabaseClient';
import type { ChatMessage } from '../types';

export class RealtimeService {
  private static channels: Map<string, any> = new Map();

  static subscribeToMessages(
    sessionId: string,
    onMessage: (message: ChatMessage) => void,
    onTyping?: (userId: string, isTyping: boolean) => void
  ) {
    const channelName = `messages:${sessionId}`;
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${sessionId}` },
        (payload: any) => {
          const message: ChatMessage = {
            id: payload.new.id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            createdAt: payload.new.created_at,
            deliveryStatus: 'delivered',
          };
          onMessage(message);
        }
      );

    if (onTyping) {
      channel.on(
        'broadcast',
        { event: 'typing' },
        (payload: any) => {
          onTyping(payload.userId, payload.isTyping);
        }
      );
    }

    channel.subscribe();
    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  static sendTyping(sessionId: string, userId: string, isTyping: boolean) {
    const channelName = `messages:${sessionId}`;
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, isTyping },
      });
    }
  }

  static unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  static async reconnect() {
    // Force reconnection
    for (const [name, channel] of this.channels) {
      supabase.removeChannel(channel);
      // Re-subscribe logic would need to be handled by the caller
    }
    this.channels.clear();
  }
}
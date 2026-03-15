'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { initAnonymousSession } from '../../lib/auth';
import { useSolaceStore } from '../../lib/store';
import ChatMessageBubble from './ChatMessageBubble';
import PanicButton from '../PanicButton';
import ReportDialog from '../moderation/ReportDialog';
import { Send, Flag } from 'lucide-react';

export default function ChatSession() {
  const { user, setUser, sessionId, setSession, messages, setMessages, addMessage, counselorId } = useSolaceStore();
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const subscriptionCleanupRef = useRef<(() => void) | null>(null);

  const loadMessages = useCallback(
    async (sessionId: string, userId: string) => {
      const res = await fetch(`/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return;
      const body = (await res.json()) as { messages: Array<any> };
      const parsed = body.messages.map((message) => ({
        id: message.id,
        senderId: message.sender_id,
        content: message.content,
        createdAt: message.created_at,
        isOwn: message.sender_id === userId,
      }));
      setMessages(parsed);
    },
    [setMessages]
  );

  const subscribeToMessages = useCallback(
    (sessionId: string, userId: string) => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.warn('Realtime client not available - skipping subscription.');
        return () => {
          // no-op
        };
      }

      const channel = supabase
        .channel(`public:messages:session:${sessionId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${sessionId}` },
          (payload) => {
            const message = payload.new;
            addMessage({
              id: message.id,
              senderId: message.sender_id,
              content: message.content,
              createdAt: message.created_at,
              isOwn: message.sender_id === userId,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    [addMessage]
  );

  useEffect(() => {
    void (async () => {
      try {
        const session = await initAnonymousSession();
        setUser(session);

        const matchRes = await fetch('/api/match/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.userId }),
        });

        if (!matchRes.ok) {
          const body = await matchRes.json();
          throw new Error(body?.error ?? 'Failed to start matching');
        }

        const match = await matchRes.json();
        setSession(match.sessionId, match.status, match.counselorId);

        // Load existing messages
        await loadMessages(match.sessionId, session.userId);

        // Subscribe to realtime messages
        const cleanup = subscribeToMessages(match.sessionId, session.userId);
        subscriptionCleanupRef.current = cleanup;
      } catch (err) {
        setError((err as Error)?.message ?? 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (subscriptionCleanupRef.current) {
        subscriptionCleanupRef.current();
        subscriptionCleanupRef.current = null;
      }
    };
  }, [setUser, setSession, loadMessages, subscribeToMessages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !sessionId || !user) return;
    const payload = {
      sessionId,
      senderId: user.userId,
      content: input.trim(),
    };
    setInput('');

    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError('Unable to send message.');
    }
  }

  async function handlePanic() {
    if (!sessionId) return;
    await fetch('/api/match/panic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
  }

  async function handleReport(type: string, details: string) {
    if (!user) return;
    await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporterId: user.userId,
        reportedUserId: counselorId ?? user.userId,
        sessionId,
        type,
        details,
      }),
    });
    setReportOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-slate-900">Session</p>
          <p className="text-xs text-slate-500">
            {sessionId ? `Session ID: ${sessionId.substring(0, 8)}…` : 'Preparing session…'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-calm-200"
          >
            <Flag className="h-4 w-4" />
            Report
          </button>
          <PanicButton onPanic={handlePanic} />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            {loading ? 'Connecting…' : 'Connected'}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-sm">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="text-sm leading-relaxed text-slate-600">
              Your session has been created. A counselor will join shortly. While you wait, feel free to share what&apos;s on your mind.
            </p>
          ) : (
            messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-200 bg-white p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
            className="flex gap-2"
          >
            <label htmlFor="message" className="sr-only">
              Message
            </label>
            <input
              id="message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-calm-400 focus:outline-none focus:ring-2 focus:ring-calm-200"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-calm-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-calm-700 focus:outline-none focus:ring-2 focus:ring-calm-500"
            >
              <Send className="mr-2 h-4 w-4" />
              Send
            </button>
          </form>
          {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
        </div>
      </div>

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={handleReport} />
    </div>
  );
}

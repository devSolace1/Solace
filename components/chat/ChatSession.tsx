'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSolaceStore } from '../../lib/store';
import { ApiService } from '../../services/api';
import { DetectionService } from '../../services/detection';
import { EmotionalAnalysisService } from '../../services/emotionalAnalysis';
import { CrisisDetectionService } from '../../services/crisisDetection';
import { AntiAbuseService } from '../../services/antiAbuse';
import { useSession } from '../../hooks/useSession';
import { useRealtime } from '../../hooks/useRealtime';
import { debounce } from '../../utils';
import ChatMessageBubble from './ChatMessageBubble';
import PanicButton from '../PanicButton';
import ReportDialog from '../moderation/ReportDialog';
import { Send, Flag, Wifi, WifiOff } from 'lucide-react';

export default function ChatSession() {
  const {
    user,
    sessionId,
    setSession,
    messages,
    setMessages,
    addMessage,
    updateMessageStatus,
    counselorId,
    connectionStatus,
    typingUsers,
    setPanicState,
    setEmotionalState,
  } = useSolaceStore();
  const { loading: sessionLoading, error: sessionError } = useSession();
  const { sendTyping } = useRealtime(sessionId);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadMessages = useCallback(
    async (sessionId: string) => {
      try {
        const data = await ApiService.getMessages(sessionId);
        const parsed = data.messages.map((message: any) => ({
          id: message.id,
          senderId: message.sender_id,
          content: message.content,
          createdAt: message.created_at,
          isOwn: message.sender_id === user?.userId,
          deliveryStatus: 'delivered' as const,
        }));
        setMessages(parsed);
      } catch (err) {
        setError('Failed to load messages');
      }
    },
    [user?.userId, setMessages]
  );

  useEffect(() => {
    const initializeChat = async () => {
      if (!user) return;

      try {
        const match = await ApiService.startMatch(user.userId);
        setSession(match.sessionId, match.status, match.counselorId);

        await loadMessages(match.sessionId);
      } catch (err) {
        setError((err as Error)?.message ?? 'Failed to start session');
      }
    };

    if (user && !sessionId) {
      initializeChat();
    }
  }, [user, sessionId, setSession, loadMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const debouncedSendTyping = useCallback(
    debounce((typing: boolean) => {
      if (user && sessionId) {
        sendTyping(user.userId, typing);
        setIsTyping(typing);
      }
    }, 500),
    [user, sessionId, sendTyping]
  );

  const handleInputChange = (value: string) => {
    setInput(value);
    debouncedSendTyping(value.length > 0);
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || !user) return;

    const content = input.trim();
    setInput('');

    // Check for abuse
    const abuseFlag = AntiAbuseService.detectAbuse(content);
    if (abuseFlag) {
      await AntiAbuseService.flagMessage(crypto.randomUUID(), sessionId, abuseFlag);
      // Show warning but still send message
      setError(AntiAbuseService.getWarningMessage(abuseFlag));
      setTimeout(() => setError(null), 5000);
    }

    // Analyze emotions
    const analysis = EmotionalAnalysisService.analyzeMessage(content);

    // Check for crisis
    const crisis = CrisisDetectionService.detectCrisis(content);
    if (crisis) {
      await CrisisDetectionService.createCrisisAlert(sessionId, user.userId, crisis);
      setPanicState({ isActive: true, escalated: true });
    }

    try {
      const tempId = crypto.randomUUID();
      const tempMessage = {
        id: tempId,
        senderId: user.userId,
        content,
        createdAt: new Date().toISOString(),
        isOwn: true,
        deliveryStatus: 'sending' as const,
      };
      addMessage(tempMessage);

      const result = await ApiService.sendMessage(sessionId, user.userId, content);
      updateMessageStatus(tempId, 'sent');

      // Store emotional signal
      await EmotionalAnalysisService.storeEmotionalSignal(sessionId, result.id, analysis);

      // Update emotional state
      setEmotionalState({
        currentMood: analysis.sadness > 0.5 ? 'sad' : analysis.distress > 0.5 ? 'anxious' : undefined,
        stressLevel: analysis.distress * 10
      });

    } catch (err) {
      setError('Unable to send message.');
      const tempId = crypto.randomUUID();
      updateMessageStatus(tempId, 'failed');
    }
  };

  const handlePanic = async () => {
    if (!sessionId) return;
    try {
      await ApiService.triggerPanic(sessionId);
      setPanicState({ isActive: true, triggeredAt: new Date(), escalated: true });
    } catch (err) {
      setError('Failed to trigger panic');
    }
  };

  const handleReport = async (type: string, details: string) => {
    if (!user || !counselorId) return;
    try {
      await ApiService.submitReport(user.userId, counselorId, type, details, sessionId);
      setReportOpen(false);
    } catch (err) {
      setError('Failed to submit report');
    }
  };

  if (sessionLoading) {
    return <div className="flex items-center justify-center p-8">Initializing session...</div>;
  }

  if (sessionError) {
    return <div className="flex items-center justify-center p-8 text-red-600">{sessionError}</div>;
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
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            {connectionStatus === 'connected' ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
            {connectionStatus}
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
          {typingUsers.size > 0 && (
            <div className="text-xs text-slate-500 italic">
              {Array.from(typingUsers).join(', ')} is typing...
            </div>
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
              onChange={(event) => handleInputChange(event.target.value)}
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

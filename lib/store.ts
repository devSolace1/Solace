import { create } from 'zustand';
import type {
  SolaceUser,
  SessionStatus,
  EmotionalState,
  PanicState,
  ConnectionStatus,
  ChatMessage,
  JournalEntry,
  MoodLog,
  EmotionalSignal,
  CrisisAlert,
  ModerationFlag,
  SupportRoom,
  SupportRoomMessage,
  Notification,
  AdminAction,
  AnalyticsEvent,
  SystemHealth,
} from '../types';

type SolaceStore = {
  user?: SolaceUser;
  sessionId?: string;
  sessionStatus?: SessionStatus;
  counselorId?: string;
  messages: ChatMessage[];
  emotionalState: EmotionalState;
  panicState: PanicState;
  connectionStatus: ConnectionStatus;
  journalEntries: JournalEntry[];
  moodLogs: MoodLog[];
  emotionalSignals: EmotionalSignal[];
  crisisAlerts: CrisisAlert[];
  moderationFlags: ModerationFlag[];
  supportRooms: SupportRoom[];
  supportRoomMessages: SupportRoomMessage[];
  typingUsers: Set<string>;
  aiCompanionActive: boolean;
  // V3.5 additions
  notifications: Notification[];
  adminActions: AdminAction[];
  analyticsEvents: AnalyticsEvent[];
  systemHealth: SystemHealth[];
  setUser: (user: SolaceUser) => void;
  setSession: (sessionId: string, status: SessionStatus, counselorId?: string) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  updateMessageStatus: (messageId: string, status: ChatMessage['deliveryStatus']) => void;
  setEmotionalState: (state: Partial<EmotionalState>) => void;
  setPanicState: (state: Partial<PanicState>) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  addJournalEntry: (entry: JournalEntry) => void;
  setJournalEntries: (entries: JournalEntry[]) => void;
  addMoodLog: (log: MoodLog) => void;
  setMoodLogs: (logs: MoodLog[]) => void;
  addEmotionalSignal: (signal: EmotionalSignal) => void;
  setEmotionalSignals: (signals: EmotionalSignal[]) => void;
  addCrisisAlert: (alert: CrisisAlert) => void;
  setCrisisAlerts: (alerts: CrisisAlert[]) => void;
  addModerationFlag: (flag: ModerationFlag) => void;
  setModerationFlags: (flags: ModerationFlag[]) => void;
  setSupportRooms: (rooms: SupportRoom[]) => void;
  addSupportRoomMessage: (message: SupportRoomMessage) => void;
  setSupportRoomMessages: (messages: SupportRoomMessage[]) => void;
  setTyping: (userId: string, isTyping: boolean) => void;
  setAiCompanionActive: (active: boolean) => void;
  // V3.5 additions
  addNotification: (notification: Notification) => void;
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  removeNotification: (id: string) => void;
  addAdminAction: (action: AdminAction) => void;
  setAdminActions: (actions: AdminAction[]) => void;
  addAnalyticsEvent: (event: AnalyticsEvent) => void;
  setSystemHealth: (health: SystemHealth[]) => void;
  clear: () => void;
};

export const useSolaceStore = create<SolaceStore>((set, get) => ({
  messages: [],
  emotionalState: {},
  panicState: { isActive: false, escalated: false },
  connectionStatus: 'disconnected',
  journalEntries: [],
  moodLogs: [],
  emotionalSignals: [],
  crisisAlerts: [],
  moderationFlags: [],
  supportRooms: [],
  supportRoomMessages: [],
  typingUsers: new Set(),
  aiCompanionActive: false,
  // V3.5 additions
  notifications: [],
  adminActions: [],
  analyticsEvents: [],
  systemHealth: [],
  setUser(user) {
    set({ user });
  },
  setSession(sessionId, sessionStatus, counselorId) {
    set({ sessionId, sessionStatus, counselorId });
  },
  addMessage(message) {
    set((state) => ({ messages: [...state.messages, message] }));
  },
  setMessages(messages) {
    set({ messages });
  },
  updateMessageStatus(messageId, status) {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, deliveryStatus: status } : msg
      ),
    }));
  },
  setEmotionalState(state) {
    set((prev) => ({ emotionalState: { ...prev.emotionalState, ...state } }));
  },
  setPanicState(state) {
    set((prev) => ({ panicState: { ...prev.panicState, ...state } }));
  },
  setConnectionStatus(connectionStatus) {
    set({ connectionStatus });
  },
  addJournalEntry(entry) {
    set((state) => ({ journalEntries: [...state.journalEntries, entry] }));
  },
  setJournalEntries(journalEntries) {
    set({ journalEntries });
  },
  addMoodLog(log) {
    set((state) => ({ moodLogs: [...state.moodLogs, log] }));
  },
  setMoodLogs(moodLogs) {
    set({ moodLogs });
  },
  addEmotionalSignal(signal) {
    set((state) => ({ emotionalSignals: [...state.emotionalSignals, signal] }));
  },
  setEmotionalSignals(emotionalSignals) {
    set({ emotionalSignals });
  },
  addCrisisAlert(alert) {
    set((state) => ({ crisisAlerts: [...state.crisisAlerts, alert] }));
  },
  setCrisisAlerts(crisisAlerts) {
    set({ crisisAlerts });
  },
  addModerationFlag(flag) {
    set((state) => ({ moderationFlags: [...state.moderationFlags, flag] }));
  },
  setModerationFlags(moderationFlags) {
    set({ moderationFlags });
  },
  setSupportRooms(supportRooms) {
    set({ supportRooms });
  },
  addSupportRoomMessage(message) {
    set((state) => ({ supportRoomMessages: [...state.supportRoomMessages, message] }));
  },
  setSupportRoomMessages(supportRoomMessages) {
    set({ supportRoomMessages });
  },
  setTyping(userId, isTyping) {
    set((state) => {
      const newTyping = new Set(state.typingUsers);
      if (isTyping) {
        newTyping.add(userId);
      } else {
        newTyping.delete(userId);
      }
      return { typingUsers: newTyping };
    });
  },
  setAiCompanionActive(aiCompanionActive) {
    set({ aiCompanionActive });
  },
  // V3.5 additions
  addNotification(notification) {
    set((state) => ({ notifications: [notification, ...state.notifications] }));
  },
  setNotifications(notifications) {
    set({ notifications });
  },
  markNotificationRead(id) {
    set((state) => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      )
    }));
  },
  removeNotification(id) {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },
  addAdminAction(action) {
    set((state) => ({ adminActions: [...state.adminActions, action] }));
  },
  setAdminActions(adminActions) {
    set({ adminActions });
  },
  addAnalyticsEvent(event) {
    set((state) => ({ analyticsEvents: [...state.analyticsEvents, event] }));
  },
  setSystemHealth(systemHealth) {
    set({ systemHealth });
  },
  clear() {
    set({
      user: undefined,
      sessionId: undefined,
      messages: [],
      sessionStatus: undefined,
      counselorId: undefined,
      emotionalState: {},
      panicState: { isActive: false, escalated: false },
      connectionStatus: 'disconnected',
      journalEntries: [],
      moodLogs: [],
      emotionalSignals: [],
      crisisAlerts: [],
      moderationFlags: [],
      supportRooms: [],
      supportRoomMessages: [],
      typingUsers: new Set(),
      aiCompanionActive: false,
      // V3.5 additions
      notifications: [],
      adminActions: [],
      analyticsEvents: [],
      systemHealth: [],
    });
  },
}));

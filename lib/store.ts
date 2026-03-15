import { create } from 'zustand';

export type UserRole = 'participant' | 'counselor' | 'moderator';

export type SolaceUser = {
  userId: string;
  role: UserRole;
  recoveryKey?: string;
};

export type SessionStatus = 'waiting' | 'active' | 'ended';

export type ChatMessage = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  isOwn?: boolean;
  isFlagged?: boolean;
};

type SolaceStore = {
  user?: SolaceUser;
  sessionId?: string;
  sessionStatus?: SessionStatus;
  counselorId?: string;
  messages: ChatMessage[];
  setUser: (user: SolaceUser) => void;
  setSession: (sessionId: string, status: SessionStatus, counselorId?: string) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clear: () => void;
};

export const useSolaceStore = create<SolaceStore>((set) => ({
  messages: [],
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
  clear() {
    set({ user: undefined, sessionId: undefined, messages: [], sessionStatus: undefined, counselorId: undefined });
  },
}));

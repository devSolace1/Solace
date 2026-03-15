import type { MatchCriteria, JournalEntry, MoodLog } from '../types';

export class ApiService {
  static async startMatch(userId: string, criteria?: MatchCriteria) {
    const res = await fetch('/api/match/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, criteria }),
    });
    if (!res.ok) throw new Error('Failed to start match');
    return res.json();
  }

  static async claimMatch(sessionId: string, counselorId: string) {
    const res = await fetch('/api/match/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, counselorId }),
    });
    if (!res.ok) throw new Error('Failed to claim match');
    return res.json();
  }

  static async triggerPanic(sessionId: string) {
    const res = await fetch('/api/match/panic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) throw new Error('Failed to trigger panic');
    return res.json();
  }

  static async sendMessage(sessionId: string, senderId: string, content: string) {
    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, senderId, content }),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  }

  static async getMessages(sessionId: string) {
    const res = await fetch(`/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw new Error('Failed to get messages');
    return res.json();
  }

  static async logMood(userId: string, mood: string, stressLevel?: number, note?: string) {
    const res = await fetch('/api/mood/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, mood, stressLevel, note }),
    });
    if (!res.ok) throw new Error('Failed to log mood');
    return res.json();
  }

  static async getMoodLogs(userId: string) {
    const res = await fetch(`/api/mood/logs?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to get mood logs');
    return res.json();
  }

  static async createJournalEntry(userId: string, content: string, visibleToCounselor: boolean = false) {
    const res = await fetch('/api/journal/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, content, visibleToCounselor }),
    });
    if (!res.ok) throw new Error('Failed to create journal entry');
    return res.json();
  }

  static async getJournalEntries(userId: string) {
    const res = await fetch(`/api/journal/entries?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to get journal entries');
    return res.json();
  }

  static async submitReport(reporterId: string, reportedUserId: string, type: string, details: string, sessionId?: string) {
    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reporterId, reportedUserId, sessionId, type, details }),
    });
    if (!res.ok) throw new Error('Failed to submit report');
    return res.json();
  }

  static async getAnalytics() {
    const res = await fetch('/api/dashboard/admin-stats');
    if (!res.ok) throw new Error('Failed to get analytics');
    return res.json();
  }
}
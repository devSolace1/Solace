'use client';

import { useEffect, useState } from 'react';
import { useSolaceStore } from '../../lib/store';
import { Calendar, MessageSquare, TrendingUp } from 'lucide-react';

type SessionSummary = {
  id: string;
  createdAt: string;
  status: string;
  messageCount: number;
};

type MoodTrend = {
  date: string;
  mood: number;
  stress: number;
};

export default function UserDashboard() {
  const { user } = useSolaceStore();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [moodTrends, setMoodTrends] = useState<MoodTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      try {
        // Load session history
        const sessionRes = await fetch('/api/dashboard/user-sessions', {
          headers: { 'X-User-Id': user!.userId },
        });
        if (sessionRes.ok) {
          const data = await sessionRes.json();
          setSessions(data.sessions);
        }

        // Load mood trends
        const moodRes = await fetch('/api/dashboard/mood-trends', {
          headers: { 'X-User-Id': user!.userId },
        });
        if (moodRes.ok) {
          const data = await moodRes.json();
          setMoodTrends(data.trends);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [user]);

  if (loading) {
    return <div className="text-center text-slate-600">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Session History */}
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="h-5 w-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Session History</h2>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-600">No sessions yet. Start your first chat to see history here.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Session {session.id.substring(0, 8)}…</p>
                  <p className="text-xs text-slate-500">{new Date(session.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">{session.messageCount} messages</p>
                  <span className={`inline-block rounded-full px-2 py-1 text-xs ${
                    session.status === 'ended' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {session.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mood Trends */}
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="h-5 w-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Mood Trends</h2>
        </div>
        {moodTrends.length === 0 ? (
          <p className="text-sm text-slate-600">Complete daily check-ins to see your mood trends.</p>
        ) : (
          <div className="space-y-3">
            {moodTrends.slice(0, 7).map((trend) => (
              <div key={trend.date} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{new Date(trend.date).toLocaleDateString()}</span>
                <div className="flex gap-2">
                  <span className="text-xs text-slate-600">Mood: {trend.mood}/10</span>
                  <span className="text-xs text-slate-600">Stress: {trend.stress}/10</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <a
            href="/chat"
            className="inline-flex items-center justify-center rounded-xl bg-calm-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-calm-700"
          >
            Start New Session
          </a>
          <a
            href="/mood"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Daily Check-in
          </a>
          <a
            href="/journal"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Write in Journal
          </a>
          <a
            href="/settings"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Account Settings
          </a>
        </div>
      </div>
    </div>
  );
}
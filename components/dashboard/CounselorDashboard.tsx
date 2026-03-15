'use client';

import { useEffect, useState } from 'react';

type ActiveSession = {
  id: string;
  created_at: string;
  updated_at: string;
  participant_label: string;
  counselor_label?: string;
  status: string;
};

type WaitingSession = {
  id: string;
  created_at: string;
  participant_label: string;
};

type MoodTrend = {
  mood: string;
  count: number;
};

type DashboardOverview = {
  activeSessions: ActiveSession[];
  waitingSessions: WaitingSession[];
  moodTrends: MoodTrend[];
  openReports: number;
};

export default function CounselorDashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadOverview();
  }, []);

  async function loadOverview() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/dashboard/overview');
    if (!res.ok) {
      setError('Unable to load dashboard');
      setLoading(false);
      return;
    }
    const data = (await res.json()) as DashboardOverview;
    setOverview(data);
    setLoading(false);
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading dashboard…</p>;
  }

  if (error || !overview) {
    return <p className="text-sm text-rose-600">{error ?? 'Failed to load dashboard.'}</p>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Active sessions</h2>
        {overview.activeSessions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No active sessions right now.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {overview.activeSessions.map((session) => (
              <div key={session.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{session.participant_label}</p>
                    <p className="text-xs text-slate-500">Session started {new Date(session.created_at).toLocaleTimeString()}</p>
                  </div>
                  <span className="rounded-full bg-calm-50 px-3 py-1 text-xs font-semibold text-calm-700">
                    {session.status}
                  </span>
                </div>
                {session.counselor_label ? (
                  <p className="mt-2 text-xs text-slate-600">Counselor: {session.counselor_label}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Waiting queue</h2>
        {overview.waitingSessions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No waiting users at the moment.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {overview.waitingSessions.map((waiting) => (
              <div key={waiting.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{waiting.participant_label}</p>
                  <p className="text-xs text-slate-500">Waiting since {new Date(waiting.created_at).toLocaleTimeString()}</p>
                </div>
                <button
                  className="rounded-lg bg-calm-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-calm-700"
                  onClick={() => void claimSession(waiting.id)}
                >
                  Claim
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Mood trends</h3>
          <div className="mt-4 space-y-2">
            {overview.moodTrends.map((trend) => (
              <div key={trend.mood} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{trend.mood.replace(/_/g, ' ')}</span>
                <span className="text-sm font-semibold text-slate-900">{trend.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Reports</h3>
          <p className="mt-3 text-sm text-slate-600">Open reports</p>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-2xl font-semibold text-slate-900">{overview.openReports}</p>
            <p className="text-xs text-slate-500">A moderator can review and resolve reports in the moderation panel.</p>
          </div>
        </div>
      </section>
    </div>
  );

  async function claimSession(sessionId: string) {
    await fetch('/api/match/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    void loadOverview();
  }
}

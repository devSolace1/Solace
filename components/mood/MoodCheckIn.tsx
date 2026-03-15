'use client';

import { useEffect, useState } from 'react';
import { getStoredSession } from '../../lib/auth';

type MoodLog = {
  id: string;
  mood: string;
  stress_level: number | null;
  note: string | null;
  created_at: string;
};

const moodOptions = [
  { label: 'Very low', value: 'very_low' },
  { label: 'Low', value: 'low' },
  { label: 'Neutral', value: 'neutral' },
  { label: 'Good', value: 'good' },
  { label: 'Very good', value: 'very_good' },
];

export default function MoodCheckIn() {
  const [mood, setMood] = useState('neutral');
  const [stress, setStress] = useState(5);
  const [note, setNote] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [history, setHistory] = useState<MoodLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    setUserId(session?.userId ?? null);
    void loadHistory(session?.userId ?? null);
  }, []);

  async function loadHistory(userId?: string | null) {
    if (!userId) return;
    const res = await fetch(`/api/mood/logs?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return;
    const body = (await res.json()) as { logs: MoodLog[] };
    setHistory(body.logs);
  }

  async function submit() {
    if (!userId) {
      setMessage('Unable to save. Session not initialized yet.');
      return;
    }

    setSaving(true);
    const res = await fetch('/api/mood/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, mood, stress_level: stress, note }),
    });
    setSaving(false);

    if (res.ok) {
      setMessage('Check-in saved.');
      setNote('');
      void loadHistory();
    } else {
      setMessage('Unable to save. Please try again.');
    }

    setTimeout(() => setMessage(null), 3000);
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">Daily check-in</h2>
        <p className="text-sm text-slate-600">Your answers are stored anonymously and help you track trends over time.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">How are you feeling today?</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {moodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMood(option.value)}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-calm-200 ${
                  mood === option.value
                    ? 'border-calm-600 bg-calm-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Stress level (0–10)</label>
          <input
            type="range"
            min={0}
            max={10}
            value={stress}
            onChange={(event) => setStress(Number(event.target.value))}
            className="w-full"
          />
          <div className="text-sm text-slate-600">{stress} / 10</div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Anything stressful happen today?</label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Optional notes..."
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 shadow-sm focus:border-calm-400 focus:outline-none focus:ring-2 focus:ring-calm-200"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-calm-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-calm-700 focus:outline-none focus:ring-2 focus:ring-calm-500 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save check-in'}
          </button>
          {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </div>
      </div>

      {history.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Recent check-ins</h3>
          <ul className="space-y-3">
            {history.slice(0, 5).map((item) => (
              <li key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  <span>
                    Mood:{' '}
                    <span className="font-semibold text-slate-700">{item.mood.replace('_', ' ')}</span>
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  Stress: <span className="font-semibold">{item.stress_level ?? '-'}</span>
                  {item.note ? ` · ${item.note}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-slate-500">You have no check-ins yet. Start today to see trends.</p>
      )}
    </section>
  );
}

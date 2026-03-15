'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSolaceStore } from '../../lib/store';

export default function CounselorLogin() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setUser } = useSolaceStore();

  async function handleLogin() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/counselor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counselorCode: code.trim() }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error ?? 'Login failed');
      }

      const data = await res.json();
      setUser({ userId: data.userId, role: 'counselor' });
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error)?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Counselor Login</h1>
          <p className="mt-2 text-sm text-slate-600">Enter your counselor code to access the dashboard.</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleLogin();
          }}
          className="mt-8 space-y-6"
        >
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-slate-700">
              Counselor Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-calm-400 focus:outline-none focus:ring-2 focus:ring-calm-200"
              placeholder="Enter your code"
              required
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-calm-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-calm-700 focus:outline-none focus:ring-2 focus:ring-calm-500 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
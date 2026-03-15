'use client';

import { useEffect, useState } from 'react';
import { getStoredSession, clearSession, initAnonymousSession } from '../../lib/auth';
import { useSolaceStore } from '../../lib/store';

export default function SettingsPanel() {
  const [session, setSession] = useState(getStoredSession());
  const [recoveryKey, setRecoveryKey] = useState(session?.recoveryKey ?? '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSession(getStoredSession());
    setRecoveryKey(getStoredSession()?.recoveryKey ?? '');
  }, []);

  const { clear } = useSolaceStore();

  function resetSession() {
    clearSession();
    clear();
    setSession(null);
    setRecoveryKey('');
  }

  async function refreshSession() {
    const updated = await initAnonymousSession();
    setSession(updated);
    setRecoveryKey(updated.recoveryKey ?? '');
  }

  async function copyKey() {
    if (!recoveryKey) return;
    await navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">Session & recovery</h2>
        <p className="text-sm text-slate-600">
          Solace is anonymous by design. Your session data is stored locally and can be restored with a recovery key.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-700">Your anonymous ID</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{session?.userId ?? 'Not initialized'}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-700">Recovery key</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{recoveryKey || 'Not generated yet'}</p>
            </div>
            <button
              type="button"
              onClick={copyKey}
              disabled={!recoveryKey}
              className="rounded-xl bg-calm-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-calm-700 focus:outline-none focus:ring-2 focus:ring-calm-500 disabled:opacity-60"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Save this key somewhere safe. You can use it to restore your session on another device.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={refreshSession}
            className="rounded-xl bg-calm-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-calm-700 focus:outline-none focus:ring-2 focus:ring-calm-500"
          >
            Refresh session
          </button>
          <button
            type="button"
            onClick={resetSession}
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-calm-500"
          >
            Reset local session
          </button>
        </div>
      </div>
    </section>
  );
}

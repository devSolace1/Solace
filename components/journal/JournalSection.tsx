'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSolaceStore } from '../../lib/store';
import { ApiService } from '../../services/api';
import { formatDate } from '../../utils';

export default function JournalSection() {
  const { user, journalEntries, setJournalEntries, addJournalEntry } = useSolaceStore();
  const [draft, setDraft] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    try {
      const data = await ApiService.getJournalEntries(user.userId);
      setJournalEntries(data.entries);
    } catch (err) {
      console.error('Failed to load journal entries');
    }
  }, [user, setJournalEntries]);

  useEffect(() => {
    if (user && journalEntries.length === 0) {
      void loadEntries();
    }
  }, [user, journalEntries.length, loadEntries]);

  async function saveEntry() {
    if (!draft.trim() || !user) return;
    setSaving(true);
    try {
      const data = await ApiService.createJournalEntry(user.userId, draft.trim(), visible);
      const newEntry = {
        id: data.id,
        content: draft.trim(),
        createdAt: new Date().toISOString(),
        visibleToCounselor: visible,
      };
      addJournalEntry(newEntry);
      setDraft('');
      setVisible(false);
    } catch (err) {
      console.error('Failed to save entry');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">Your entries</h2>
        <p className="text-sm text-slate-600">
          Entries are private unless you choose to share them with your counselor.
        </p>
      </div>

      <div className="space-y-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write something for today..."
          rows={5}
          className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 shadow-sm focus:border-calm-400 focus:outline-none focus:ring-2 focus:ring-calm-200"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={visible}
              onChange={(event) => setVisible(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-calm-600 focus:ring-calm-500"
            />
            Share with counselor
          </label>
          <button
            type="button"
            onClick={saveEntry}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-calm-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-calm-700 focus:outline-none focus:ring-2 focus:ring-calm-500 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      </div>

      {journalEntries.length > 0 ? (
        <div className="space-y-4">
          {journalEntries.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {formatDate(entry.createdAt)}
                </span>
                <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">
                  {entry.visibleToCounselor ? 'Shared' : 'Private'}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{entry.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No entries yet. Write something when you&apos;re ready.</p>
      )}
    </section>
  );
}

'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';

type Props = {
  onSubmit: (type: string, details: string) => Promise<void>;
  onClose: () => void;
  open: boolean;
};

const reportOptions = [
  { value: 'harassment', label: 'Harassment or inappropriate behavior' },
  { value: 'boundary', label: 'Boundary crossed (personal requests, dating, etc.)' },
  { value: 'safety', label: 'I feel unsafe' },
  { value: 'other', label: 'Other' },
];

export default function ReportDialog({ open, onClose, onSubmit }: Props) {
  const [type, setType] = useState(reportOptions[0].value);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    await onSubmit(type, details);
    setSending(false);
    setSent(true);
    setDetails('');
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Report a problem</h2>
            <p className="mt-1 text-sm text-slate-600">Your report helps us keep this space safe. It is anonymous.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-700">Thank you. Your report has been submitted.</p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl bg-calm-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-calm-700"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">What happened?</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-calm-400 focus:outline-none focus:ring-2 focus:ring-calm-200"
            >
              {reportOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="block text-sm font-medium text-slate-700">Details (optional)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              placeholder="Tell us what happened..."
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 shadow-sm focus:border-calm-400 focus:outline-none focus:ring-2 focus:ring-calm-200"
            />

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-60"
              >
                <Flag className="h-4 w-4" />
                {sending ? 'Sending…' : 'Submit report'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

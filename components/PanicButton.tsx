'use client';

import { AlertTriangle } from 'lucide-react';
import { useSolaceStore } from '../lib/store';

type Props = {
  onPanic: () => void | Promise<void>;
};

export default function PanicButton({ onPanic }: Props) {
  const { panicState } = useSolaceStore();

  if (panicState.isActive) {
    return (
      <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm animate-pulse">
        <AlertTriangle className="h-4 w-4" />
        EMERGENCY ACTIVE
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void onPanic()}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
      aria-label="Panic button"
    >
      <AlertTriangle className="h-4 w-4" />
      Panic
    </button>
  );
}

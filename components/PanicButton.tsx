'use client';

import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useSolaceStore } from '../lib/store';

type Props = {
  onPanic: () => void | Promise<void>;
};

export default function PanicButton({ onPanic }: Props) {
  const { panicState } = useSolaceStore();
  const [showModal, setShowModal] = useState(false);

  if (panicState.isActive) {
    return (
      <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm animate-pulse">
        <AlertTriangle className="h-4 w-4" />
        EMERGENCY ACTIVE
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
        aria-label="Panic button"
      >
        <AlertTriangle className="h-4 w-4" />
        Panic
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h2 className="text-lg font-bold mb-4">Emergency Contacts - Indonesia</h2>
            <p className="mb-2"><strong>119 ext 8</strong> - Yayasan Pulih (Mental Health Crisis)</p>
            <p className="mb-4"><strong>Other options:</strong> Local police or hospital emergency</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  void onPanic();
                }}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Confirm Panic Alert
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

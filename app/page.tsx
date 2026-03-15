import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-calm-200 text-calm-700">
            <Heart className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900">
              Welcome to Solace
            </h1>
            <p className="mt-2 text-base text-slate-600">
              A calm, anonymous space to share what&apos;s on your mind and connect with trained listeners.
            </p>
          </div>
        </div>

        <div className="mt-10 space-y-4">
          <Link
            href="/chat"
            className="inline-flex w-full items-center justify-center rounded-xl bg-calm-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-calm-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-calm-500"
          >
            Start a session (anonymous)
          </Link>

          <Link
            href="/journal"
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-calm-500"
          >
            Journal & check-in
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-calm-500"
          >
            Dashboard
          </Link>

          <Link
            href="/counselor"
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-calm-500"
          >
            Counselor Login
          </Link>
        </div>

        <div className="mt-10 text-sm text-slate-500">
          <p>
            All sessions are anonymous. No names, emails, or phone numbers are required. You can optionally save a recovery key to restore your session on another device.
          </p>
          <p className="mt-2">
            If you are in immediate danger, please contact local emergency services. Solace is not a crisis hotline.
          </p>
        </div>
      </section>
    </main>
  );
}

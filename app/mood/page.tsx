import MoodCheckIn from '../../components/mood/MoodCheckIn';

export default function MoodPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Daily check-in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track your emotional trends with a short daily check-in. Your answers are stored anonymously.
        </p>
      </header>

      <MoodCheckIn />
    </div>
  );
}

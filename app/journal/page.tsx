import JournalSection from '../../components/journal/JournalSection';

export default function JournalPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Private journal</h1>
        <p className="mt-2 text-sm text-slate-600">
          Write your thoughts in a private journal. Entries are encrypted and not shared unless you choose to.
        </p>
      </header>

      <JournalSection />
    </div>
  );
}

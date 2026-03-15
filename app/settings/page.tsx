import SettingsPanel from '../../components/settings/SettingsPanel';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-2 text-sm text-slate-600">
          Adjust your preferences and manage your recovery key. Solace never stores your identity.
        </p>
      </header>

      <SettingsPanel />
    </div>
  );
}

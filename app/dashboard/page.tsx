'use client';

import { useSolaceStore } from '../../lib/store';
import CounselorDashboard from '../../components/dashboard/CounselorDashboard';
import UserDashboard from '../../components/dashboard/UserDashboard';
import AdminDashboard from '../../components/dashboard/AdminDashboard';

export default function DashboardPage() {
  const { user } = useSolaceStore();

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <p className="text-center text-slate-600">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          {user.role === 'counselor' ? 'Counselor Dashboard' : user.role === 'moderator' ? 'Admin Dashboard' : 'Your Dashboard'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {user.role === 'counselor'
            ? 'Monitor active sessions, help waiting users, and view anonymized trends. No personal identifiers are shown.'
            : user.role === 'moderator'
            ? 'Manage platform, review reports, and monitor system health.'
            : 'Track your emotional journey, view session history, and manage your account.'}
        </p>
      </header>

      {user.role === 'counselor' && <CounselorDashboard />}
      {user.role === 'moderator' && <AdminDashboard />}
      {user.role === 'participant' && <UserDashboard />}
    </div>
  );
}

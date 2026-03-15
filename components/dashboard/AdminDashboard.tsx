'use client';

import { useEffect, useState } from 'react';
import { useSolaceStore } from '../../lib/store';
import { Users, MessageSquare, AlertTriangle, Activity } from 'lucide-react';

type Stats = {
  totalUsers: number;
  activeSessions: number;
  pendingReports: number;
  totalMessages: number;
};

type Report = {
  id: string;
  reporterId: string;
  reportedUserId: string;
  type: string;
  details: string;
  createdAt: string;
};

export default function AdminDashboard() {
  const { user } = useSolaceStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'moderator') return;

    async function loadData() {
      try {
        // Load stats
        const statsRes = await fetch('/api/dashboard/admin-stats', {
          headers: { 'X-User-Id': user!.userId },
        });
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }

        // Load recent reports
        const reportsRes = await fetch('/api/dashboard/admin-reports', {
          headers: { 'X-User-Id': user!.userId },
        });
        if (reportsRes.ok) {
          const data = await reportsRes.json();
          setReports(data.reports);
        }
      } catch (err) {
        console.error('Failed to load admin data:', err);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [user]);

  if (loading) {
    return <div className="text-center text-slate-600">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-calm-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats?.totalUsers || 0}</p>
              <p className="text-sm text-slate-600">Total Users</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-calm-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats?.activeSessions || 0}</p>
              <p className="text-sm text-slate-600">Active Sessions</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats?.pendingReports || 0}</p>
              <p className="text-sm text-slate-600">Pending Reports</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-calm-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats?.totalMessages || 0}</p>
              <p className="text-sm text-slate-600">Total Messages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Reports</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-600">No recent reports.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Report Type: {report.type}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(report.createdAt).toLocaleString()}</p>
                    <p className="text-sm text-slate-700 mt-2">{report.details}</p>
                  </div>
                  <button className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-200">
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Actions */}
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Admin Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-200">
            View All Users
          </button>
          <button className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-200">
            Manage Counselors
          </button>
          <button className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-200">
            System Logs
          </button>
          <button className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-200">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
}
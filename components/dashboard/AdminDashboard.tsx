'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSolaceStore } from '../../lib/store';
import {
  Users,
  MessageSquare,
  AlertTriangle,
  Activity,
  Shield,
  TrendingUp,
  Settings,
  FileText,
  UserCheck,
  BarChart3,
  Database,
  Server,
  Flag,
  Eye,
  Ban,
  CheckCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Link from 'next/link';

type PlatformStats = {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  pendingReports: number;
  resolvedReports: number;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
};

type RecentActivity = {
  id: string;
  type: 'session_started' | 'report_created' | 'user_flagged' | 'crisis_alert';
  description: string;
  timestamp: string;
  severity?: 'low' | 'medium' | 'high';
};

type SystemMetric = {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: string;
  uptime: number;
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function AdminDashboard() {
  const { user, notifications } = useSolaceStore();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'moderator') return;
    loadDashboardData();
  }, [user]);

  async function loadDashboardData() {
    try {
      const [statsRes, activityRes, metricsRes] = await Promise.all([
        fetch('/api/dashboard/admin/stats'),
        fetch('/api/dashboard/admin/activity'),
        fetch('/api/system/health')
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (activityRes.ok) {
        const data = await activityRes.json();
        setRecentActivity(data.activities || []);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setSystemMetrics(data.slice(0, 4)); // Show latest 4
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleResolveReport = async (reportId: string) => {
    try {
      await fetch('/api/admin/reports/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, adminId: user?.userId })
      });
      loadDashboardData(); // Refresh
    } catch (err) {
      console.error('Failed to resolve report:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const criticalNotifications = notifications.filter(n => n.priority === 'urgent');

  return (
    <motion.div
      className="space-y-8"
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      {/* Header */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Monitor platform health, manage reports, and oversee system operations.
              </p>
            </div>
            {criticalNotifications.length > 0 && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                  {criticalNotifications.length}
                </span>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Platform Overview */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Platform Overview</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Total Users</h3>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {stats?.totalUsers || 0}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {stats?.activeUsers || 0} active today
            </p>
          </Card>

          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Active Sessions</h3>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {stats?.activeSessions || 0}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              of {stats?.totalSessions || 0} total
            </p>
          </Card>

          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-3">
              <Flag className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Pending Reports</h3>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {stats?.pendingReports || 0}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {stats?.resolvedReports || 0} resolved
            </p>
          </Card>

          <Card className="text-center">
            <div className={`flex items-center justify-center w-12 h-12 rounded-lg mx-auto mb-3 ${
              stats?.systemHealth === 'healthy'
                ? 'bg-green-100'
                : stats?.systemHealth === 'degraded'
                ? 'bg-yellow-100'
                : 'bg-red-100'
            }`}>
              <Server className={`h-6 w-6 ${
                stats?.systemHealth === 'healthy'
                  ? 'text-green-600'
                  : stats?.systemHealth === 'degraded'
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`} />
            </div>
            <h3 className="font-semibold text-gray-900">System Health</h3>
            <p className={`text-2xl font-bold mt-1 capitalize ${
              stats?.systemHealth === 'healthy'
                ? 'text-green-600'
                : stats?.systemHealth === 'degraded'
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}>
              {stats?.systemHealth || 'Unknown'}
            </p>
          </Card>
        </div>
      </motion.div>

      {/* System Health */}
      <motion.div variants={fadeInUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">System Health</h2>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {systemMetrics.map((metric) => (
            <Card key={metric.component}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 capitalize">
                    {metric.component}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {metric.uptime}% uptime
                  </p>
                </div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  metric.status === 'healthy'
                    ? 'bg-green-100'
                    : metric.status === 'degraded'
                    ? 'bg-yellow-100'
                    : 'bg-red-100'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${
                    metric.status === 'healthy'
                      ? 'bg-green-500'
                      : metric.status === 'degraded'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`} />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Last checked: {new Date(metric.lastChecked).toLocaleTimeString()}
              </p>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={fadeInUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>

        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">No recent activity</h3>
                <p className="text-gray-600 text-sm">
                  Activity will appear here as users interact with the platform.
                </p>
              </div>
            </Card>
          ) : (
            recentActivity.map((activity) => (
              <Card key={activity.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      activity.severity === 'high'
                        ? 'bg-red-100'
                        : activity.severity === 'medium'
                        ? 'bg-yellow-100'
                        : 'bg-blue-100'
                    }`}>
                      {activity.type === 'session_started' && <MessageSquare className="h-4 w-4 text-blue-600" />}
                      {activity.type === 'report_created' && <Flag className="h-4 w-4 text-yellow-600" />}
                      {activity.type === 'user_flagged' && <Ban className="h-4 w-4 text-red-600" />}
                      {activity.type === 'crisis_alert' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.description}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {activity.type === 'report_created' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResolveReport(activity.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </motion.div>

      {/* Admin Tools */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Tools</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/reports">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
                  <Flag className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Reports Management</h3>
                  <p className="text-sm text-gray-600">Review and resolve user reports</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/moderation">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
                  <Shield className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Moderation Queue</h3>
                  <p className="text-sm text-gray-600">Manage flagged content</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/counselors">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Counselor Management</h3>
                  <p className="text-sm text-gray-600">Oversee counselor accounts</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/analytics">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Platform Analytics</h3>
                  <p className="text-sm text-gray-600">View usage statistics</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/system">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                  <Database className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">System Health</h3>
                  <p className="text-sm text-gray-600">Monitor system performance</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/settings">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
                  <Settings className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">System Settings</h3>
                  <p className="text-sm text-gray-600">Configure platform settings</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
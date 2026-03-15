'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSolaceStore } from '../../lib/store';
import {
  MessageSquare,
  BookOpen,
  TrendingUp,
  Heart,
  Calendar,
  Clock,
  Activity,
  Target,
  Plus,
  Bell
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Link from 'next/link';

type EmotionalSummary = {
  weeklyMoodTrend: number;
  recoveryProgress: number;
  recentSessionSummary: string;
  streakDays: number;
};

type QuickAction = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
};

const quickActions: QuickAction[] = [
  {
    title: 'Start Conversation',
    description: 'Connect with a trained listener',
    icon: MessageSquare,
    href: '/chat',
    color: 'bg-blue-500'
  },
  {
    title: 'Write in Journal',
    description: 'Reflect on your thoughts',
    icon: BookOpen,
    href: '/journal',
    color: 'bg-green-500'
  },
  {
    title: 'Mood Check-in',
    description: 'Track how you\'re feeling',
    icon: Heart,
    href: '/mood',
    color: 'bg-purple-500'
  },
  {
    title: 'View Progress',
    description: 'See your emotional journey',
    icon: TrendingUp,
    href: '/progress',
    color: 'bg-orange-500'
  }
];

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

export default function UserDashboard() {
  const { user, notifications } = useSolaceStore();
  const [emotionalSummary, setEmotionalSummary] = useState<EmotionalSummary | null>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadDashboardData() {
      try {
        // Load emotional summary
        const summaryRes = await fetch('/api/dashboard/emotional-summary', {
          headers: { 'X-User-Id': user.userId },
        });
        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setEmotionalSummary(data);
        }

        // Load recent sessions
        const sessionsRes = await fetch('/api/dashboard/recent-sessions', {
          headers: { 'X-User-Id': user.userId },
        });
        if (sessionsRes.ok) {
          const data = await sessionsRes.json();
          setRecentSessions(data.sessions || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

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

  const unreadNotifications = notifications.filter(n => !n.isRead);

  return (
    <motion.div
      className="space-y-8"
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      {/* Welcome Header */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-gray-600 mt-1">
                How are you feeling today? Remember, you're taking positive steps.
              </p>
            </div>
            {unreadNotifications.length > 0 && (
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  {unreadNotifications.length}
                </span>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Emotional Summary Cards */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Emotional Journey</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Weekly Trend</h3>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {emotionalSummary?.weeklyMoodTrend ? `${emotionalSummary.weeklyMoodTrend > 0 ? '+' : ''}${emotionalSummary.weeklyMoodTrend}%` : 'N/A'}
            </p>
            <p className="text-sm text-gray-600 mt-1">vs last week</p>
          </Card>

          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Recovery Progress</h3>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {emotionalSummary?.recoveryProgress || 0}%
            </p>
            <p className="text-sm text-gray-600 mt-1">overall improvement</p>
          </Card>

          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Session Streak</h3>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {emotionalSummary?.streakDays || 0}
            </p>
            <p className="text-sm text-gray-600 mt-1">days active</p>
          </Card>

          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-3">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Last Session</h3>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              {recentSessions.length > 0 ? 'Recent' : 'None'}
            </p>
            <p className="text-sm text-gray-600 mt-1">activity status</p>
          </Card>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              variants={fadeInUp}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href={action.href}>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${action.color}`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={fadeInUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
          <Link href="/history">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {recentSessions.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">No recent sessions</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Start your first conversation to begin your emotional wellness journey.
                </p>
                <Link href="/chat">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Start Session
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            recentSessions.slice(0, 3).map((session: any) => (
              <Card key={session.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Support Session</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      session.status === 'ended'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </motion.div>

      {/* Daily Reminder */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
              <Heart className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Daily Wellness Check</h3>
              <p className="text-gray-600 text-sm">
                How are you feeling today? Taking a moment for self-reflection can make a big difference.
              </p>
            </div>
            <Link href="/mood">
              <Button size="sm">
                Check In
              </Button>
            </Link>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
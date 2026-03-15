'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSolaceStore } from '../../lib/store';
import {
  Users,
  AlertTriangle,
  MessageSquare,
  Clock,
  CheckCircle,
  UserPlus,
  TrendingUp,
  Activity,
  Play,
  Pause,
  X,
  Eye
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

type ActiveSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  participantLabel: string;
  emotionalState?: {
    currentMood?: string;
    riskLevel?: string;
    lastActivity: string;
  };
  messageCount: number;
  duration: number;
};

type WaitingUser = {
  id: string;
  joinedAt: string;
  waitTime: number;
  riskLevel?: string;
  preferredTopics?: string[];
};

type DashboardStats = {
  activeSessions: number;
  waitingUsers: number;
  completedToday: number;
  averageSessionTime: number;
  panicAlerts: number;
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

export default function CounselorDashboard() {
  const { user, notifications } = useSolaceStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [waitingUsers, setWaitingUsers] = useState<WaitingUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  async function loadDashboardData() {
    try {
      const [statsRes, sessionsRes, waitingRes] = await Promise.all([
        fetch('/api/dashboard/counselor/stats'),
        fetch('/api/dashboard/counselor/sessions'),
        fetch('/api/dashboard/counselor/waiting')
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setActiveSessions(data.sessions || []);
      }

      if (waitingRes.ok) {
        const data = await waitingRes.json();
        setWaitingUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleAcceptSession = async (sessionId: string) => {
    try {
      const res = await fetch('/api/counselor/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, counselorId: user?.userId })
      });

      if (res.ok) {
        loadDashboardData(); // Refresh data
      }
    } catch (err) {
      console.error('Failed to accept session:', err);
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      const res = await fetch('/api/counselor/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (res.ok) {
        loadDashboardData(); // Refresh data
      }
    } catch (err) {
      console.error('Failed to complete session:', err);
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

  const panicNotifications = notifications.filter(n => n.type === 'panic_alert');

  return (
    <motion.div
      className="space-y-8"
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      {/* Header */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Counselor Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Monitor active sessions, help waiting users, and provide emotional support.
              </p>
            </div>
            {panicNotifications.length > 0 && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                  {panicNotifications.length}
                </span>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Stats Overview */}
      <motion.div variants={fadeInUp}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Active Sessions</h3>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {stats?.activeSessions || 0}
            </p>
          </Card>

          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-3">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Waiting Users</h3>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {stats?.waitingUsers || 0}
            </p>
          </Card>

          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Completed Today</h3>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {stats?.completedToday || 0}
            </p>
          </Card>

          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Avg Session Time</h3>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {stats?.averageSessionTime ? `${Math.round(stats.averageSessionTime)}m` : 'N/A'}
            </p>
          </Card>

          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mx-auto mb-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Panic Alerts</h3>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {stats?.panicAlerts || 0}
            </p>
          </Card>
        </div>
      </motion.div>

      {/* Active Sessions */}
      <motion.div variants={fadeInUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Active Sessions</h2>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>

        <div className="space-y-4">
          {activeSessions.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">No active sessions</h3>
                <p className="text-gray-600 text-sm">
                  Accept a waiting user to start providing support.
                </p>
              </div>
            </Card>
          ) : (
            activeSessions.map((session) => (
              <Card key={session.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Session with {session.participantLabel}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Started {new Date(session.createdAt).toLocaleTimeString()}</span>
                        <span>{session.messageCount} messages</span>
                        <span>{Math.round(session.duration / 60)}m duration</span>
                      </div>
                      {session.emotionalState && (
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">Mood:</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            session.emotionalState.riskLevel === 'high'
                              ? 'bg-red-100 text-red-800'
                              : session.emotionalState.riskLevel === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {session.emotionalState.currentMood || 'Unknown'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(`/chat/${session.id}`, '_blank')}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Join
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCompleteSession(session.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </motion.div>

      {/* Waiting Users */}
      <motion.div variants={fadeInUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Waiting Users</h2>
        </div>

        <div className="space-y-4">
          {waitingUsers.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">No users waiting</h3>
                <p className="text-gray-600 text-sm">
                  Users will appear here when they request support.
                </p>
              </div>
            </Card>
          ) : (
            waitingUsers.map((user) => (
              <Card key={user.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        User waiting for support
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Waiting {Math.round(user.waitTime / 60)}m</span>
                        {user.riskLevel && (
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.riskLevel === 'high'
                              ? 'bg-red-100 text-red-800'
                              : user.riskLevel === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.riskLevel} priority
                          </span>
                        )}
                      </div>
                      {user.preferredTopics && user.preferredTopics.length > 0 && (
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">Topics:</span>
                          <div className="flex space-x-1">
                            {user.preferredTopics.slice(0, 3).map((topic) => (
                              <span key={topic} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleAcceptSession(user.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">View Trends</h3>
                <p className="text-sm text-gray-600">Emotional patterns & insights</p>
              </div>
            </div>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Session History</h3>
                <p className="text-sm text-gray-600">Review past conversations</p>
              </div>
            </div>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Crisis Resources</h3>
                <p className="text-sm text-gray-600">Emergency support guides</p>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}

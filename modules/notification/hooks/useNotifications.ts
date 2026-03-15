'use client';

import { useState, useEffect, useCallback } from 'react';
import { NotificationService } from '../services/NotificationService';
import type {
  NotificationEvent,
  NotificationPreferences,
  NotificationFilter,
  NotificationResult,
  NotificationBatchResult,
  NotificationType,
  NotificationPriority,
  NotificationChannel
} from '../types';

const notificationService = new NotificationService();

export function useNotifications(userId: string | null, filter: NotificationFilter = {}) {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await notificationService.getUserNotifications(userId, filter);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, filter]);

  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const success = await notificationService.markAsRead(notificationId, userId);
      if (success) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
      return false;
    }
  }, [userId]);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      const success = await notificationService.markAllAsRead(userId);
      if (success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
      return false;
    }
  }, [userId]);

  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const success = await notificationService.deleteNotification(notificationId, userId);
      if (success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        // Recalculate unread count
        const updatedUnread = notifications.filter(n => n.id !== notificationId && !n.is_read).length;
        setUnreadCount(updatedUnread);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
      return false;
    }
  }, [userId, notifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: loadNotifications
  };
}

export function useNotificationActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendNotification = useCallback(async (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    priority: NotificationPriority = 'medium',
    expiresAt?: string
  ): Promise<NotificationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await notificationService.sendNotification(
        userId,
        type,
        title,
        message,
        data,
        priority,
        expiresAt
      );
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send notification';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendBatchNotification = useCallback(async (
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    priority: NotificationPriority = 'medium'
  ): Promise<NotificationBatchResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await notificationService.sendBatchNotification(
        userIds,
        type,
        title,
        message,
        data,
        priority
      );
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send batch notifications';
      setError(errorMessage);
      return {
        success: false,
        sent_count: 0,
        failed_count: userIds.length,
        errors: [errorMessage]
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    sendNotification,
    sendBatchNotification,
    clearError: () => setError(null)
  };
}

export function useNotificationPreferences(userId: string | null) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await notificationService.getUserPreferences(userId);
      setPreferences(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notification preferences';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const updatePreferences = useCallback(async (
    updates: Partial<Omit<NotificationPreferences, 'user_id' | 'subscriptions'>>
  ): Promise<boolean> => {
    if (!userId) return false;

    setIsLoading(true);
    setError(null);

    try {
      const success = await notificationService.updateUserPreferences(userId, updates);
      if (success && preferences) {
        setPreferences({ ...preferences, ...updates });
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, preferences]);

  const subscribeToType = useCallback(async (
    eventType: NotificationType,
    channels: NotificationChannel[]
  ): Promise<boolean> => {
    if (!userId) return false;

    setIsLoading(true);
    setError(null);

    try {
      const success = await notificationService.subscribeToNotifications(userId, eventType, channels);
      if (success) {
        await loadPreferences(); // Reload to get updated subscriptions
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe to notifications';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadPreferences]);

  const unsubscribeFromType = useCallback(async (eventType: NotificationType): Promise<boolean> => {
    if (!userId) return false;

    setIsLoading(true);
    setError(null);

    try {
      const success = await notificationService.unsubscribeFromNotifications(userId, eventType);
      if (success) {
        await loadPreferences(); // Reload to get updated subscriptions
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unsubscribe from notifications';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadPreferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    subscribeToType,
    unsubscribeFromType,
    refetch: loadPreferences
  };
}

export function useNotificationStats(userId: string | null) {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await notificationService.getNotificationStats(userId);
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notification stats';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: loadStats
  };
}

// Real-time notification subscription hook
export function useRealtimeNotifications(userId: string | null) {
  const [newNotifications, setNewNotifications] = useState<NotificationEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Set up realtime subscription for new notifications
    const channel = notificationService.supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_events_v5',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNewNotifications(prev => [payload.new as NotificationEvent, ...prev]);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const clearNewNotifications = useCallback(() => {
    setNewNotifications([]);
  }, []);

  return {
    newNotifications,
    isConnected,
    clearNewNotifications
  };
}
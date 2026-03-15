'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnalyticsService } from '../services/AnalyticsService';
import type {
  AnalyticsEvent,
  UserAnalytics,
  PlatformAnalytics,
  AnalyticsFilter,
  AnalyticsResult,
  PrivacySettings,
  AnalyticsEventType,
  DateRange
} from '../types';

const analyticsService = new AnalyticsService();

export function useAnalytics() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const trackEvent = useCallback(async (
    eventType: AnalyticsEventType,
    eventName: string,
    properties: Record<string, any> = {},
    userId?: string
  ): Promise<AnalyticsResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await analyticsService.trackEvent(
        eventType,
        eventName,
        properties,
        userId,
        sessionIdRef.current || undefined
      );
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to track event';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startSession = useCallback(async (userId?: string, referrer?: string): Promise<string> => {
    try {
      const sessionId = await analyticsService.startSession(userId, referrer);
      sessionIdRef.current = sessionId;
      return sessionId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session';
      setError(errorMessage);
      // Return a fallback session ID
      const fallbackId = `fallback_${Date.now()}`;
      sessionIdRef.current = fallbackId;
      return fallbackId;
    }
  }, []);

  const endSession = useCallback(async (): Promise<boolean> => {
    if (!sessionIdRef.current) return false;

    try {
      const success = await analyticsService.endSession(sessionIdRef.current);
      if (success) {
        sessionIdRef.current = null;
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session');
      return false;
    }
  }, []);

  // Auto-track page views
  useEffect(() => {
    const trackPageView = () => {
      trackEvent('page_view', 'page_view', {
        page: window.location.pathname,
        referrer: document.referrer,
        title: document.title
      });
    };

    trackPageView();

    const handleRouteChange = () => {
      trackPageView();
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [trackEvent]);

  // Handle page visibility changes (session management)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, potentially ending session
        const endSessionTimer = setTimeout(() => {
          if (sessionIdRef.current) {
            endSession();
          }
        }, 30000); // End session after 30 seconds of inactivity

        const handleVisibilityReturn = () => {
          clearTimeout(endSessionTimer);
          document.removeEventListener('visibilitychange', handleVisibilityReturn);
        };

        document.addEventListener('visibilitychange', handleVisibilityReturn);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [endSession]);

  return {
    isLoading,
    error,
    trackEvent,
    startSession,
    endSession,
    currentSessionId: sessionIdRef.current,
    clearError: () => setError(null)
  };
}

export function useAnalyticsEvents(filter: AnalyticsFilter = {}) {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getAnalyticsEvents(filter);
      setEvents(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics events';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    events,
    isLoading,
    error,
    refetch: loadEvents
  };
}

export function useUserAnalytics(userId: string | null, dateRange?: DateRange) {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getUserAnalytics(userId, dateRange);
      setAnalytics(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user analytics';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refetch: loadAnalytics
  };
}

export function usePlatformAnalytics(dateRange?: DateRange) {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getPlatformAnalytics(dateRange);
      setAnalytics(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load platform analytics';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refetch: loadAnalytics
  };
}

export function useAnalyticsPrivacy(userId: string | null) {
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrivacySettings = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getUserPrivacySettings(userId);
      setPrivacySettings(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load privacy settings';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const updatePrivacySettings = useCallback(async (
    settings: Partial<Omit<PrivacySettings, 'user_id' | 'updated_at'>>
  ): Promise<boolean> => {
    if (!userId) return false;

    setIsLoading(true);
    setError(null);

    try {
      const success = await analyticsService.updatePrivacySettings(userId, settings);
      if (success && privacySettings) {
        setPrivacySettings({ ...privacySettings, ...settings });
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update privacy settings';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, privacySettings]);

  const exportUserData = useCallback(async (): Promise<any> => {
    if (!userId) throw new Error('User ID required');

    setIsLoading(true);
    setError(null);

    try {
      const data = await analyticsService.exportUserData(userId);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export user data';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const deleteUserData = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    setIsLoading(true);
    setError(null);

    try {
      const success = await analyticsService.deleteUserData(userId);
      if (success) {
        setPrivacySettings(null);
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user data';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPrivacySettings();
  }, [loadPrivacySettings]);

  return {
    privacySettings,
    isLoading,
    error,
    updatePrivacySettings,
    exportUserData,
    deleteUserData,
    refetch: loadPrivacySettings
  };
}

// Hook for tracking feature usage
export function useFeatureTracking(featureName: string, userId?: string) {
  const { trackEvent } = useAnalytics();

  const trackFeatureUsage = useCallback(async (
    action: string,
    properties: Record<string, any> = {}
  ) => {
    await trackEvent('feature_usage', `${featureName}_${action}`, {
      feature: featureName,
      action,
      ...properties
    }, userId);
  }, [trackEvent, featureName, userId]);

  const trackFeatureStart = useCallback(async (properties?: Record<string, any>) => {
    await trackFeatureUsage('start', properties);
  }, [trackFeatureUsage]);

  const trackFeatureEnd = useCallback(async (properties?: Record<string, any>) => {
    await trackFeatureUsage('end', properties);
  }, [trackFeatureUsage]);

  const trackFeatureError = useCallback(async (error: string, properties?: Record<string, any>) => {
    await trackFeatureUsage('error', { error, ...properties });
  }, [trackFeatureUsage]);

  return {
    trackFeatureUsage,
    trackFeatureStart,
    trackFeatureEnd,
    trackFeatureError
  };
}

// Hook for tracking user engagement
export function useEngagementTracking(userId?: string) {
  const { trackEvent } = useAnalytics();

  const trackEngagement = useCallback(async (
    engagementType: string,
    properties: Record<string, any> = {}
  ) => {
    await trackEvent('engagement', engagementType, properties, userId);
  }, [trackEvent, userId]);

  const trackTimeSpent = useCallback(async (feature: string, duration: number) => {
    await trackEngagement('time_spent', { feature, duration_seconds: duration });
  }, [trackEngagement]);

  const trackInteraction = useCallback(async (element: string, action: string) => {
    await trackEngagement('interaction', { element, action });
  }, [trackEngagement]);

  return {
    trackEngagement,
    trackTimeSpent,
    trackInteraction
  };
}
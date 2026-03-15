'use client';

import { useState, useEffect, useCallback } from 'react';
import { ModerationService } from '../services/ModerationService';
import type {
  Report,
  ModerationAction,
  ModerationStats,
  ModerationFilter,
  ModerationResult,
  AutoModerationResult,
  ReportType,
  ModerationActionType,
  ContentType
} from '../types';

const moderationService = new ModerationService();

export function useModerationReports(filter: ModerationFilter = {}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await moderationService.getReports(filter);
      setReports(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load moderation reports';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return {
    reports,
    isLoading,
    error,
    refetch: loadReports
  };
}

export function useModerationActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReport = useCallback(async (
    reporterId: string,
    reportType: ReportType,
    contentType: ContentType,
    reason: string,
    description?: string,
    reportedUserId?: string,
    reportedContentId?: string
  ): Promise<ModerationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await moderationService.submitReport(
        reporterId,
        reportType,
        contentType,
        reason,
        description,
        reportedUserId,
        reportedContentId
      );
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit report';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const takeAction = useCallback(async (
    reportId: string,
    moderatorId: string,
    actionType: ModerationActionType,
    reason: string,
    details?: Record<string, any>,
    duration?: number
  ): Promise<ModerationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await moderationService.takeModerationAction(
        reportId,
        moderatorId,
        actionType,
        reason,
        details,
        duration
      );
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to take moderation action';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const autoModerate = useCallback(async (
    contentId: string,
    contentType: ContentType,
    content: string,
    metadata?: Record<string, any>
  ): Promise<AutoModerationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await moderationService.autoModerateContent(
        contentId,
        contentType,
        content,
        metadata
      );
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to auto-moderate content';
      setError(errorMessage);
      return {
        content_id: contentId,
        should_flag: false,
        flags: [],
        confidence: 0
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    submitReport,
    takeAction,
    autoModerate,
    clearError: () => setError(null)
  };
}

export function useModerationStats() {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await moderationService.getModerationStats();
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load moderation stats';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

export function useUserModerationHistory(userId: string | null) {
  const [history, setHistory] = useState<ModerationAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await moderationService.getUserModerationHistory(userId);
      setHistory(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load moderation history';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    isLoading,
    error,
    refetch: loadHistory
  };
}

export function useModerationRules() {
  const [rules, setRules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await moderationService.getActiveModerationRules();
      setRules(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load moderation rules';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const upsertRule = useCallback(async (rule: any): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await moderationService.upsertModerationRule(rule);
      if (success) {
        await loadRules(); // Reload rules
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update moderation rule';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadRules]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  return {
    rules,
    isLoading,
    error,
    upsertRule,
    refetch: loadRules
  };
}

// Hook for real-time moderation queue updates
export function useModerationQueue() {
  const [queueLength, setQueueLength] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Set up realtime subscription for moderation queue
    const channel = moderationService.supabase
      .channel('moderation_queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'moderation_queue_v5'
        },
        async () => {
          // Reload queue stats when queue changes
          try {
            const stats = await moderationService.getModerationStats();
            setQueueLength(stats.pending_reports);
            setUrgentCount(
              Object.entries(stats.reports_by_priority)
                .filter(([priority]) => priority === 'urgent' || priority === 'critical')
                .reduce((sum, [, count]) => sum + count, 0)
            );
          } catch (error) {
            console.error('Failed to update queue stats:', error);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Initial load
    moderationService.getModerationStats().then(stats => {
      setQueueLength(stats.pending_reports);
      setUrgentCount(
        Object.entries(stats.reports_by_priority)
          .filter(([priority]) => priority === 'urgent' || priority === 'critical')
          .reduce((sum, [, count]) => sum + count, 0)
      );
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return {
    queueLength,
    urgentCount,
    isConnected
  };
}
'use client';

import { useState, useEffect, useCallback } from 'react';
import { EmotionalStateService } from '../services/EmotionalStateService';
import { SessionIntelligenceService } from '../services/SessionIntelligenceService';
import { CounselorMatchingService } from '../services/CounselorMatchingService';
import { PanicEscalationService } from '../services/PanicEscalationService';
import type {
  EmotionalState,
  EmotionalStateModel,
  SessionIntelligence,
  MatchingCriteria,
  CounselorMatch,
  PanicAlert,
  PlatformMetrics
} from '../types/types';

const emotionalStateService = new EmotionalStateService();
const sessionIntelligenceService = new SessionIntelligenceService();
const counselorMatchingService = new CounselorMatchingService();
const panicEscalationService = new PanicEscalationService();

// Emotional State Hooks
export function useEmotionalState(userId: string | null) {
  const [emotionalState, setEmotionalState] = useState<EmotionalStateModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEmotionalState = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const state = await emotionalStateService.calculateEmotionalState(userId);
      setEmotionalState(state);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load emotional state';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadEmotionalState();
  }, [loadEmotionalState]);

  return {
    emotionalState,
    isLoading,
    error,
    refetch: loadEmotionalState
  };
}

// Session Intelligence Hooks
export function useSessionIntelligence(sessionId: string | null) {
  const [intelligence, setIntelligence] = useState<SessionIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIntelligence = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await sessionIntelligenceService.analyzeSession(sessionId);
      setIntelligence(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze session';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadIntelligence();
  }, [loadIntelligence]);

  return {
    intelligence,
    isLoading,
    error,
    refetch: loadIntelligence
  };
}

export function useSessionHealth(sessionId: string | null) {
  const [health, setHealth] = useState<{
    health: 'good' | 'concerning' | 'critical';
    metrics: { continuity: number; fatigue: number; engagement: number };
    alerts: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadHealth = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const data = await sessionIntelligenceService.getSessionHealthMetrics(sessionId);
      setHealth(data);
    } catch (error) {
      console.error('Failed to load session health:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  return {
    health,
    isLoading,
    refetch: loadHealth
  };
}

// Counselor Matching Hooks
export function useCounselorMatching() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findMatches = useCallback(async (criteria: MatchingCriteria): Promise<CounselorMatch[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const matches = await counselorMatchingService.findBestMatch(criteria);
      return matches;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find counselor matches';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const findEmergencyMatch = useCallback(async (criteria: MatchingCriteria): Promise<CounselorMatch | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const match = await counselorMatchingService.findEmergencyMatch(criteria);
      return match;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find emergency match';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    findMatches,
    findEmergencyMatch,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}

// Panic Escalation Hooks
export function usePanicEscalation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAlert = useCallback(async (
    sessionId: string,
    userId: string,
    triggerReason: 'user_button' | 'auto_detection',
    emotionalState?: EmotionalState,
    riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<PanicAlert | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const alert = await panicEscalationService.createPanicAlert(
        sessionId,
        userId,
        triggerReason,
        emotionalState,
        riskLevel
      );
      return alert;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create panic alert';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolveAlert = useCallback(async (alertId: string, resolverId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await panicEscalationService.resolvePanicAlert(alertId, resolverId);
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resolve alert';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createAlert,
    resolveAlert,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}

export function useActivePanicAlerts() {
  const [alerts, setAlerts] = useState<PanicAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const activeAlerts = await panicEscalationService.getActiveAlerts();
      setAlerts(activeAlerts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load panic alerts';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  return {
    alerts,
    isLoading,
    error,
    refetch: loadAlerts
  };
}

export function usePanicStats() {
  const [stats, setStats] = useState<{
    totalToday: number;
    byLevel: Record<1 | 2 | 3, number>;
    averageResponseTime: number;
    resolutionRate: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await panicEscalationService.getEscalationStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load panic stats:', error);
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
    refetch: loadStats
  };
}

// Platform Intelligence Hook
export function usePlatformIntelligence() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // This would aggregate data from multiple services
      // For now, return mock data structure
      const mockMetrics: PlatformMetrics = {
        activeUsers: 0,
        activeSessions: 0,
        averageSessionDuration: 0,
        panicAlertsToday: 0,
        counselorUtilization: 0,
        systemHealth: {
          databaseLatency: 0,
          realtimeConnections: 0,
          errorRate: 0
        }
      };

      setMetrics(mockMetrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load platform metrics';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refetch: loadMetrics
  };
}
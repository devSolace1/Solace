'use client';

import { useState, useEffect, useCallback } from 'react';
import { EmotionService } from '../services/EmotionService';
import type { MoodCheckIn, EmotionalTrend, RecoveryInsight, CopingStrategy, JournalEntry, EmotionEntry } from '../types';

const emotionService = new EmotionService();

export function useEmotion() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMoodCheckIn = useCallback(async (
    userId: string,
    overallMood: number,
    emotions: Omit<EmotionEntry, 'id' | 'user_id' | 'created_at'>[],
    energyLevel: number,
    sleepQuality: number,
    stressLevel: number,
    notes?: string
  ): Promise<MoodCheckIn | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const checkIn = await emotionService.createMoodCheckIn(
        userId,
        overallMood,
        emotions,
        energyLevel,
        sleepQuality,
        stressLevel,
        notes
      );
      return checkIn;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create mood check-in';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMoodHistory = useCallback(async (userId: string, limit: number = 30): Promise<MoodCheckIn[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const history = await emotionService.getMoodHistory(userId, limit);
      return history;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load mood history';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getEmotionalTrends = useCallback(async (userId: string, days: number = 30): Promise<EmotionalTrend[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const trends = await emotionService.getEmotionalTrends(userId, days);
      return trends;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load emotional trends';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRecoveryInsights = useCallback(async (userId: string, period: 'week' | 'month' = 'week'): Promise<RecoveryInsight | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const insights = await emotionService.getRecoveryInsights(userId, period);
      return insights;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recovery insights';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCopingStrategies = useCallback(async (category?: string, difficulty?: string): Promise<CopingStrategy[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const strategies = await emotionService.getCopingStrategies(category, difficulty);
      return strategies;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load coping strategies';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createJournalEntry = useCallback(async (
    userId: string,
    title: string,
    content: string,
    moodBefore: number,
    emotions: string[],
    tags: string[],
    isPrivate: boolean = true
  ): Promise<JournalEntry | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const entry = await emotionService.createJournalEntry(
        userId,
        title,
        content,
        moodBefore,
        emotions,
        tags,
        isPrivate
      );
      return entry;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create journal entry';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getJournalEntries = useCallback(async (userId: string, limit: number = 20): Promise<JournalEntry[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const entries = await emotionService.getJournalEntries(userId, limit);
      return entries;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load journal entries';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateJournalMoodAfter = useCallback(async (entryId: string, moodAfter: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await emotionService.updateJournalMoodAfter(entryId, moodAfter);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update journal entry';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createMoodCheckIn,
    getMoodHistory,
    getEmotionalTrends,
    getRecoveryInsights,
    getCopingStrategies,
    createJournalEntry,
    getJournalEntries,
    updateJournalMoodAfter,
    clearError: () => setError(null)
  };
}

export function useMoodHistory(userId: string | null, limit: number = 30) {
  const [moodHistory, setMoodHistory] = useState<MoodCheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMoodHistory = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const history = await emotionService.getMoodHistory(userId, limit);
      setMoodHistory(history);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load mood history';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    loadMoodHistory();
  }, [loadMoodHistory]);

  return {
    moodHistory,
    isLoading,
    error,
    refetch: loadMoodHistory
  };
}

export function useEmotionalTrends(userId: string | null, days: number = 30) {
  const [trends, setTrends] = useState<EmotionalTrend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrends = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const trendData = await emotionService.getEmotionalTrends(userId, days);
      setTrends(trendData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load emotional trends';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, days]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  return {
    trends,
    isLoading,
    error,
    refetch: loadTrends
  };
}

export function useRecoveryInsights(userId: string | null, period: 'week' | 'month' = 'week') {
  const [insights, setInsights] = useState<RecoveryInsight | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const insightData = await emotionService.getRecoveryInsights(userId, period);
      setInsights(insightData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recovery insights';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, period]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  return {
    insights,
    isLoading,
    error,
    refetch: loadInsights
  };
}

export function useCopingStrategies(category?: string, difficulty?: string) {
  const [strategies, setStrategies] = useState<CopingStrategy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStrategies = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const strategyData = await emotionService.getCopingStrategies(category, difficulty);
      setStrategies(strategyData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load coping strategies';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [category, difficulty]);

  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  return {
    strategies,
    isLoading,
    error,
    refetch: loadStrategies
  };
}

export function useJournal(userId: string | null, limit: number = 20) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const entryData = await emotionService.getJournalEntries(userId, limit);
      setEntries(entryData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load journal entries';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit]);

  const addEntry = useCallback(async (
    title: string,
    content: string,
    moodBefore: number,
    emotions: string[],
    tags: string[],
    isPrivate: boolean = true
  ): Promise<JournalEntry | null> => {
    if (!userId) return null;

    setIsLoading(true);
    setError(null);

    try {
      const newEntry = await emotionService.createJournalEntry(
        userId,
        title,
        content,
        moodBefore,
        emotions,
        tags,
        isPrivate
      );
      setEntries(prev => [newEntry, ...prev]);
      return newEntry;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create journal entry';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const updateMoodAfter = useCallback(async (entryId: string, moodAfter: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await emotionService.updateJournalMoodAfter(entryId, moodAfter);
      setEntries(prev => prev.map(entry =>
        entry.id === entryId ? { ...entry, mood_after: moodAfter } : entry
      ));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update journal entry';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  return {
    entries,
    isLoading,
    error,
    addEntry,
    updateMoodAfter,
    refetch: loadEntries
  };
}
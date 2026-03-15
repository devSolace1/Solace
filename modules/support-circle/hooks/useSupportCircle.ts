'use client';

import { useState, useEffect, useCallback } from 'react';
import { SupportCircleService } from '../services/SupportCircleService';
import type {
  SupportCircle,
  CircleMembership,
  CirclePost,
  CircleReply,
  CircleEvent,
  CircleResource,
  CircleStats,
  CircleSearchFilters,
  CircleResult,
  CircleCategory,
  CircleVisibility,
  PostType,
  EventType
} from '../types';

const supportCircleService = new SupportCircleService();

export function useSupportCircles(userId: string | null) {
  const [circles, setCircles] = useState<SupportCircle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserCircles = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await supportCircleService.getUserCircles(userId);
      setCircles(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load support circles';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const createCircle = useCallback(async (
    name: string,
    description: string,
    category: CircleCategory,
    visibility: CircleVisibility,
    maxMembers: number = 50,
    rules: string[] = [],
    tags: string[] = []
  ): Promise<CircleResult> => {
    if (!userId) return { success: false, error: 'User not authenticated' };

    setIsLoading(true);
    setError(null);

    try {
      const result = await supportCircleService.createCircle(
        name,
        description,
        category,
        visibility,
        userId,
        maxMembers,
        rules,
        tags
      );
      if (result.success) {
        await loadUserCircles(); // Reload circles
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create support circle';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadUserCircles]);

  const joinCircle = useCallback(async (circleId: string): Promise<CircleResult> => {
    if (!userId) return { success: false, error: 'User not authenticated' };

    setIsLoading(true);
    setError(null);

    try {
      const result = await supportCircleService.joinCircle(circleId, userId);
      if (result.success) {
        await loadUserCircles(); // Reload circles
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join circle';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadUserCircles]);

  const leaveCircle = useCallback(async (circleId: string): Promise<boolean> => {
    if (!userId) return false;

    setIsLoading(true);
    setError(null);

    try {
      const success = await supportCircleService.leaveCircle(circleId, userId);
      if (success) {
        await loadUserCircles(); // Reload circles
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave circle';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadUserCircles]);

  useEffect(() => {
    loadUserCircles();
  }, [loadUserCircles]);

  return {
    circles,
    isLoading,
    error,
    createCircle,
    joinCircle,
    leaveCircle,
    refetch: loadUserCircles
  };
}

export function useCircleSearch(filters: CircleSearchFilters = {}) {
  const [circles, setCircles] = useState<SupportCircle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCircles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await supportCircleService.searchCircles(filters);
      setCircles(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search circles';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    searchCircles();
  }, [searchCircles]);

  return {
    circles,
    isLoading,
    error,
    refetch: searchCircles
  };
}

export function useCirclePosts(circleId: string, userId?: string, limit: number = 20) {
  const [posts, setPosts] = useState<CirclePost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await supportCircleService.getCirclePosts(circleId, userId, limit);
      setPosts(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load posts';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [circleId, userId, limit]);

  const createPost = useCallback(async (
    content: string,
    postType: PostType = 'discussion',
    title?: string,
    isAnonymous: boolean = false
  ): Promise<CircleResult> => {
    if (!userId) return { success: false, error: 'User not authenticated' };

    setIsLoading(true);
    setError(null);

    try {
      const result = await supportCircleService.createPost(
        circleId,
        userId,
        content,
        postType,
        title,
        isAnonymous
      );
      if (result.success) {
        await loadPosts(); // Reload posts
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [circleId, userId, loadPosts]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return {
    posts,
    isLoading,
    error,
    createPost,
    refetch: loadPosts
  };
}

export function useCircleEvents(circleId: string, userId?: string) {
  const [events, setEvents] = useState<CircleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // This would need to be implemented in the service
      // For now, return empty array
      setEvents([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load events';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [circleId]);

  const createEvent = useCallback(async (
    title: string,
    description: string,
    eventType: EventType,
    startTime: string,
    endTime: string,
    location?: any,
    maxAttendees?: number
  ): Promise<CircleResult> => {
    if (!userId) return { success: false, error: 'User not authenticated' };

    setIsLoading(true);
    setError(null);

    try {
      const result = await supportCircleService.createEvent(
        circleId,
        userId,
        title,
        description,
        eventType,
        startTime,
        endTime,
        location,
        maxAttendees
      );
      if (result.success) {
        await loadEvents(); // Reload events
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [circleId, userId, loadEvents]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    events,
    isLoading,
    error,
    createEvent,
    refetch: loadEvents
  };
}

export function useCircleModeration(circleId: string, userId?: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moderateContent = useCallback(async (
    contentId: string,
    contentType: 'post' | 'reply' | 'resource',
    action: string,
    reason: string
  ): Promise<boolean> => {
    if (!userId) return false;

    setIsLoading(true);
    setError(null);

    try {
      const success = await supportCircleService.moderateContent(
        circleId,
        contentId,
        contentType,
        userId,
        action as any,
        reason
      );
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to moderate content';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [circleId, userId]);

  return {
    isLoading,
    error,
    moderateContent,
    clearError: () => setError(null)
  };
}

export function useCircleStats() {
  const [stats, setStats] = useState<CircleStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await supportCircleService.getCircleStats();
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load circle stats';
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

export function useRecommendedCircles(userId: string | null, limit: number = 5) {
  const [circles, setCircles] = useState<SupportCircle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await supportCircleService.getRecommendedCircles(userId, limit);
      setCircles(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recommendations';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  return {
    circles,
    isLoading,
    error,
    refetch: loadRecommendations
  };
}

// Hook for real-time circle updates
export function useCircleRealtime(circleId: string) {
  const [newPosts, setNewPosts] = useState<CirclePost[]>([]);
  const [newMembers, setNewMembers] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Set up realtime subscription for circle updates
    const channel = supportCircleService.supabase
      .channel(`circle_${circleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'circle_posts_v5',
          filter: `circle_id=eq.${circleId}`
        },
        (payload) => {
          setNewPosts(prev => [payload.new as CirclePost, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'circle_memberships_v5',
          filter: `circle_id=eq.${circleId}`
        },
        () => {
          setNewMembers(prev => prev + 1);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      channel.unsubscribe();
    };
  }, [circleId]);

  const clearNewPosts = useCallback(() => {
    setNewPosts([]);
  }, []);

  const clearNewMembers = useCallback(() => {
    setNewMembers(0);
  }, []);

  return {
    newPosts,
    newMembers,
    isConnected,
    clearNewPosts,
    clearNewMembers
  };
}
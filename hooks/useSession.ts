import { useEffect, useState } from 'react';
import { initAnonymousSession, restoreSession, rotateSessionId } from '../lib/auth';
import { useSolaceStore } from '../lib/store';
import type { SolaceSession } from '../types';

export function useSession() {
  const { user, setUser } = useSolaceStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const session = await initAnonymousSession();
        setUser(session);
      } catch (err) {
        setError((err as Error)?.message ?? 'Failed to initialize session');
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, [setUser]);

  const restore = async (recoveryKey: string) => {
    try {
      const session = await restoreSession(recoveryKey);
      if (session) {
        setUser(session);
        return true;
      }
      return false;
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed to restore session');
      return false;
    }
  };

  const rotate = async () => {
    if (!user) return;
    try {
      const newSession = await rotateSessionId(user);
      setUser(newSession);
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed to rotate session');
    }
  };

  return {
    user,
    loading,
    error,
    restore,
    rotate,
  };
}
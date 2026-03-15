import type { SolaceSession } from '../types';

const STORAGE_KEY = 'solace_session_v2';
const COOKIE_KEY = 'solace_session_v2';
const ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export function getStoredSession(): SolaceSession | null {
  if (typeof window === 'undefined') return null;

  // Try localStorage first
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const session = JSON.parse(raw) as SolaceSession & { expiresAt: number };
      if (Date.now() < session.expiresAt) {
        return session;
      } else {
        // Expired, remove
        window.localStorage.removeItem(STORAGE_KEY);
        document.cookie = `${COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    }
  } catch {
    // Ignore
  }

  // Try cookie
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === COOKIE_KEY && value) {
        const session = JSON.parse(decodeURIComponent(value)) as SolaceSession & { expiresAt: number };
        if (Date.now() < session.expiresAt) {
          // Restore to localStorage
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
          return session;
        }
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

export function storeSession(session: SolaceSession) {
  if (typeof window === 'undefined') return;

  const sessionWithExpiry = {
    ...session,
    expiresAt: Date.now() + ROTATION_INTERVAL,
  };

  // Store in localStorage
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionWithExpiry));

  // Store in cookie (httpOnly would be better, but for client-side, this is fine)
  const cookieValue = encodeURIComponent(JSON.stringify(sessionWithExpiry));
  document.cookie = `${COOKIE_KEY}=${cookieValue}; max-age=${ROTATION_INTERVAL / 1000}; path=/; SameSite=Strict`;
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  document.cookie = `${COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export async function initAnonymousSession(): Promise<SolaceSession> {
  const existing = getStoredSession();
  if (existing) return existing;

  const newId = crypto.randomUUID();
  const recoveryKey = crypto.randomUUID();
  const session: SolaceSession = {
    userId: newId,
    role: 'participant',
    recoveryKey,
  };

  // Persist server-side user record and recovery key
  await fetch('/api/auth/anonymous', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: session.userId, recoveryKey }),
  });

  storeSession(session);
  return session;
}

export async function restoreSession(recoveryKey: string): Promise<SolaceSession | null> {
  const res = await fetch('/api/auth/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recoveryKey }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { userId: string; role: SolaceSession['role'] };
  const session: SolaceSession = {
    userId: data.userId,
    role: data.role,
    recoveryKey,
  };
  storeSession(session);
  return session;
}

export async function rotateSessionId(currentSession: SolaceSession): Promise<SolaceSession> {
  const newId = crypto.randomUUID();
  const newSession: SolaceSession = {
    ...currentSession,
    userId: newId,
  };

  // Update server-side
  await fetch('/api/auth/rotate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldUserId: currentSession.userId, newUserId: newId }),
  });

  storeSession(newSession);
  return newSession;
}

export type SolaceSession = {
  userId: string;
  role: 'participant' | 'counselor' | 'moderator';
  recoveryKey?: string;
};

const STORAGE_KEY = 'solace_session';

export function getStoredSession(): SolaceSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SolaceSession;
  } catch {
    return null;
  }
}

export function storeSession(session: SolaceSession) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
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

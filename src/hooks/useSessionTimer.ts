'use client';

import { useEffect, useState, useCallback } from 'react';

const SESSION_KEY = 'darktalk_session';

interface SessionData {
  id: string;
  token: string;
  darkId: string;
  handle: string;
  expiresAt: string;
}

function readSessionFromStorage(): SessionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

/**
 * Hook that reads session.expiresAt from localStorage and updates in real-time.
 * - Initial value comes from the prop
 * - On every render it reads from localStorage (cheap), so updates from socket events are picked up
 * - Re-renders every second to update the countdown display
 * - Listens for cross-tab storage events to sync timer across windows
 */
export function useSessionTimer(initialExpiresAt: string | Date) {
  const initialIso = typeof initialExpiresAt === 'string'
    ? initialExpiresAt
    : initialExpiresAt.toISOString();

  const [expiresAt, setExpiresAt] = useState<string>(initialIso);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const refresh = useCallback(() => {
    const stored = readSessionFromStorage();
    if (stored?.expiresAt) {
      setExpiresAt((prev) => (prev === stored.expiresAt ? prev : stored.expiresAt));
    }
  }, []);

  // Sync from localStorage on mount and on cross-tab storage events
  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  // Update countdown every second, and re-read from localStorage every second too
  // so socket events that update expiresAt are picked up immediately.
  useEffect(() => {
    let lastExpiresAt = expiresAt;

    const tick = () => {
      // Refresh from storage
      const stored = readSessionFromStorage();
      if (stored?.expiresAt && stored.expiresAt !== lastExpiresAt) {
        lastExpiresAt = stored.expiresAt;
        setExpiresAt(stored.expiresAt);
        return; // next tick will compute countdown with new value
      }

      const now = Date.now();
      const expiry = new Date(lastExpiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return { timeLeft, expiresAt };
}
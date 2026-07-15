'use client';

import { useCallback, useState } from 'react';
import { useSessionStore } from './useStore';
import { useRouter } from 'next/navigation';

export function useSession() {
  const session = useSessionStore((state) => state.session);
  const isLoading = useSessionStore((state) => state.isLoading);
  const error = useSessionStore((state) => state.error);
  const setSession = useSessionStore((state) => state.setSession);
  const setLoading = useSessionStore((state) => state.setLoading);
  const setError = useSessionStore((state) => state.setError);
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const createSession = useCallback(async () => {
    if (isCreating) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/session/create', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create session');
        return null;
      }

      setSession({
        id: '',
        token: data.sessionToken,
        darkId: data.darkId,
        handle: 'Anon',
        ipHash: '',
        expiresAt: new Date(data.expiresAt),
        createdAt: new Date(),
      });

      router.refresh();
      return data;
    } catch (err) {
      setError('Network error. Please try again.');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, setError, setSession, router]);

  const refreshSession = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/session/refresh', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.session) {
        setSession({
          id: '',
          token: data.session.token,
          darkId: data.session.darkId,
          handle: data.session.handle,
          ipHash: '',
          expiresAt: new Date(data.session.expiresAt),
          createdAt: new Date(),
        });
        return true;
      }

      setSession(null);
      return false;
    } catch (err) {
      setError('Failed to refresh session');
      return false;
    }
  }, [setLoading, setSession, setError]);

  const destroySession = useCallback(async () => {
    try {
      await fetch('/api/session/destroy', {
        method: 'DELETE',
      });

      setSession(null);
      router.refresh();
    } catch (err) {
      console.error('Failed to destroy session:', err);
    }
  }, [setSession, router]);

  return {
    session,
    isLoading,
    isCreating,
    error,
    createSession,
    refreshSession,
    destroySession,
  };
}

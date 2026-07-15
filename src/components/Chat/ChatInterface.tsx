'use client';

import { useState, useEffect, useCallback } from 'react';
import WelcomeScreen from './WelcomeScreen';
import ChatScreen from './ChatScreen';
import LoadingScreen from './LoadingScreen';

interface ChatInterfaceProps {
  initialSession: any;
}

const SESSION_KEY = 'darktalk_session';

export default function ChatInterface({ initialSession }: ChatInterfaceProps) {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Validate and load session
  useEffect(() => {
    const loadSession = async () => {
      const savedSession = localStorage.getItem(SESSION_KEY);

      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);

          // Always validate session with server
          const response = await fetch('/api/session/validate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${parsed.token}` },
          });

          if (response.ok) {
            const data = await response.json();
            setSession(data.session);
            localStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
            setIsLoading(false);
            return;
          }

          // 401 means token is invalid/expired - clear stale localStorage
          console.warn('[ChatInterface] Stale session token detected, clearing localStorage');
          localStorage.removeItem(SESSION_KEY);
        } catch (err) {
          // Network error - keep localStorage, try again later
          console.error('[ChatInterface] Network error validating session:', err);
        }
      }

      // Try server-side cookie session (if available)
      if (initialSession) {
        setSession(initialSession);
        localStorage.setItem(SESSION_KEY, JSON.stringify(initialSession));
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
    };

    loadSession();
  }, [initialSession]);

  const createSession = useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      const response = await fetch('/api/session/create', {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        const newSession = {
          id: data.sessionId || '',
          token: data.sessionToken,
          darkId: data.darkId,
          handle: 'Anon',
          ipHash: '',
          expiresAt: new Date(data.expiresAt),
          createdAt: new Date(),
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
        setSession(newSession);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      setIsCreating(false);
    }
  }, [isCreating]);

  const destroySession = useCallback(async () => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        await fetch('/api/session/destroy', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${parsed.token}` },
        });
      } catch {}
    }
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <WelcomeScreen onStart={createSession} isLoading={isCreating} />;
  }

  return <ChatScreen session={session} onLogout={destroySession} />;
}

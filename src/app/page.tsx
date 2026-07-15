'use client';

import { useState, useEffect } from 'react';
import { cookies } from 'next/headers';
import ChatInterface from '@/components/Chat/ChatInterface';

const SESSION_KEY = 'darktalk_session';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to get session from localStorage first
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (new Date(parsed.expiresAt) > new Date()) {
          setSession(parsed);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return <ChatInterface initialSession={session} />;
}

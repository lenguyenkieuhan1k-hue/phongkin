'use client';

import { useState } from 'react';
import { useSessionTimer } from '@/hooks/useSessionTimer';

interface UserHeaderProps {
  darkId: string;
  expiresAt: Date | string;
  onInviteClick: () => void;
  onLogout: () => void;
}

export default function UserHeader({ darkId, expiresAt, onInviteClick, onLogout }: UserHeaderProps) {
  const [copied, setCopied] = useState(false);
  const { timeLeft } = useSessionTimer(expiresAt);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(darkId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleLogout = () => {
    if (confirm('End session and clear all data?')) {
      onLogout();
    }
  };

  return (
    <header className="border-b border-dark-800 bg-dark-900/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-600 to-accent-800 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <span className="font-semibold text-white">DarkTalk</span>
          </div>

          {/* Your Dark ID */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-dark-800 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-500">Your Dark ID:</span>
              <button
                onClick={handleCopy}
                className="font-mono text-sm text-accent-400 hover:text-accent-300 transition-colors"
              >
                {copied ? 'Copied!' : darkId}
              </button>
              <svg
                className={`w-4 h-4 ${copied ? 'text-green-500' : 'text-gray-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {copied ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                )}
              </svg>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-2 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs">{timeLeft}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onInviteClick}
                className="btn btn-primary text-sm py-1.5"
              >
                Connect
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-dark-800 text-gray-500 hover:text-red-400 transition-colors"
                title="End session"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

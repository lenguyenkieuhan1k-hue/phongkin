'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';

interface IncomingInvite {
  roomId: string;
  fromDarkId: string;
  status: string;
}

interface IncomingInviteProviderProps {
  children: ReactNode;
  sessionToken: string;
}

export function IncomingInviteProvider({ children, sessionToken }: IncomingInviteProviderProps) {
  const [invite, setInvite] = useState<IncomingInvite | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let attempts = 0;
    let mounted = true;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const tryAttach = () => {
      if (!mounted) return;
      const socket = (window as any).__socket;
      if (socket) {
        console.log('[IncomingInvite] attaching to socket');

        const handler = (data: IncomingInvite) => {
          console.log('[IncomingInvite] received:', data);
          setError(null);
          setInvite(data);
        };

        socket.on('room:invite', handler);

        cleanupRef.current = () => {
          socket.off('room:invite', handler);
        };
      } else {
        attempts += 1;
        if (attempts < 20) {
          pollTimer = setTimeout(tryAttach, 200);
        } else {
          console.warn('[IncomingInvite] socket not found after 20 attempts');
        }
      }
    };

    tryAttach();

    return () => {
      mounted = false;
      if (pollTimer) clearTimeout(pollTimer);
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  const accept = async () => {
    if (!invite) return;
    setIsAccepting(true);
    setError(null);
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ roomId: invite.roomId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to accept');
        return;
      }
      const socket = (window as any).__socket;
      if (socket?.connected) {
        socket.emit('room:join', { roomId: invite.roomId });
      }
      setInvite(null);
    } catch (err) {
      console.error('[IncomingInvite] accept error:', err);
      setError('Network error');
    } finally {
      setIsAccepting(false);
    }
  };

  const reject = async () => {
    if (!invite) return;
    try {
      await fetch('/api/invite/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ roomId: invite.roomId }),
      });
    } catch (err) {
      console.error('[IncomingInvite] reject error:', err);
    }
    setInvite(null);
  };

  return (
    <>
      {children}
      {invite && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl p-6 max-w-md w-full border border-dark-700 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Incoming Connection</h2>
                <p className="text-sm text-gray-400">Someone wants to chat with you</p>
              </div>
            </div>

            <div className="bg-dark-900 rounded-lg p-4 mb-6">
              <p className="text-xs text-gray-500 mb-1">From</p>
              <p className="font-mono text-lg text-white tracking-wider">{invite.fromDarkId}</p>
              <p className="text-xs text-gray-500 mt-2">Room ID</p>
              <p className="font-mono text-xs text-gray-400 break-all">{invite.roomId}</p>
            </div>

            {error && (
              <p className="text-sm text-red-400 mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={reject}
                disabled={isAccepting}
                className="flex-1 btn btn-secondary disabled:opacity-50"
              >
                Decline
              </button>
              <button
                onClick={accept}
                disabled={isAccepting}
                className="flex-1 btn btn-primary disabled:opacity-50"
              >
                {isAccepting ? 'Connecting...' : 'Accept'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
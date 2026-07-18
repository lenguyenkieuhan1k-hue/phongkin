'use client';

import { useState, useEffect, useRef } from 'react';
import { useVoiceCallStore } from '@/hooks/useStore';

export default function IncomingCall() {
  const { status, peerName, callerSocketId } = useVoiceCallStore();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevStatus = useRef(status);

  useEffect(() => {
    if (status === 'ringing' && prevStatus.current !== 'ringing') {
      setVisible(true);
      setDismissed(false);
    } else if (status !== 'ringing' && prevStatus.current === 'ringing') {
      setTimeout(() => setVisible(false), 200);
    }
    prevStatus.current = status;
  }, [status]);

  const handleAccept = () => setDismissed(true);
  const handleReject = () => {
    if (typeof window !== 'undefined' && (window as any).__socket) {
      (window as any).__socket.emit('voice:call:reject', { targetSocketId: callerSocketId });
    }
    setDismissed(true);
  };

  if (!visible || dismissed || status !== 'ringing') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-800 border border-accent-400/30 rounded-2xl p-6 w-72 text-center shadow-2xl animate-slideUp">
        <div className="relative mx-auto mb-4 w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 animate-pulse opacity-20" />
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {peerName?.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent-400 flex items-center justify-center animate-bounce">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </div>
        </div>

        <p className="text-white font-semibold text-lg mb-1">{peerName ?? 'Người lạ'}</p>
        <p className="text-accent-400 text-sm mb-6 animate-pulse">cuộc gọi thoại...</p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleReject}
            className="w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center hover:bg-red-500/30 transition-colors"
          >
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
              />
            </svg>
          </button>

          <button
            onClick={handleAccept}
            className="w-14 h-14 rounded-full bg-accent-500/20 border-2 border-accent-400 flex items-center justify-center hover:bg-accent-500/30 transition-colors"
          >
            <svg className="w-7 h-7 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

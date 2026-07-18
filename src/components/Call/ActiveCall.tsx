'use client';

import { useState, useEffect } from 'react';
import { useVoiceCallStore } from '@/hooks/useStore';

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function ActiveCall() {
  const { status, peerName, callStartedAt, isMuted, isConnecting } = useVoiceCallStore();

  const endCall = () => {
    if (typeof window !== 'undefined' && (window as any).__socket) {
      (window as any).__socket.emit('voice:call:end');
    }
    useVoiceCallStore.getState().setVoiceCall({ status: 'ended' });
    setTimeout(() => useVoiceCallStore.getState().resetVoiceCall(), 1500);
  };

  const toggleMute = () => {
    const store = useVoiceCallStore.getState();
    if (store.isMuted) {
      store.setVoiceCall({ isMuted: false });
    } else {
      store.setVoiceCall({ isMuted: true });
    }
  };
  const [elapsed, setElapsed] = useState(0);
  const [minimized, setMinimized] = useState(false);

  const isActive = status === 'connected' || status === 'calling' || status === 'ringing';

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      if (callStartedAt) {
        setElapsed(Date.now() - callStartedAt);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, callStartedAt]);

  if (!isActive && status !== 'ended') return null;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-[90] bg-dark-800/95 border border-accent-400/30 rounded-full w-14 h-14 flex items-center justify-center shadow-2xl hover:scale-105 transition-transform animate-pulse"
      >
        <svg className="w-6 h-6 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[90] bg-dark-800/95 backdrop-blur-xl border border-accent-400/30 rounded-2xl shadow-2xl shadow-black/60 w-64 overflow-hidden animate-slideUp">
      {/* Status bar */}
      <div className="bg-gradient-to-r from-accent-500/10 to-accent-600/10 px-4 py-2 flex items-center justify-between border-b border-accent-400/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
          <span className="text-xs text-accent-300">
            {isConnecting
              ? 'Đang kết nối...'
              : status === 'calling'
              ? 'Đang gọi...'
              : status === 'ringing'
              ? 'Đang đổ chuông...'
              : status === 'connected'
              ? 'Đã kết nối'
              : 'Kết thúc'}
          </span>
        </div>
        {status === 'connected' && (
          <span className="text-xs font-mono text-accent-300">{formatDuration(elapsed)}</span>
        )}
        <button
          onClick={() => setMinimized(true)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-white">
            {peerName?.charAt(0).toUpperCase() ?? '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{peerName ?? 'Cuộc gọi'}</p>
          {status === 'connected' && (
            <p className="text-xs text-accent-400">{formatDuration(elapsed)}</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={toggleMute}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isMuted
                ? 'bg-red-500/20 text-red-400'
                : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
            }`}
          >
            {isMuted ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            )}
          </button>

          <button
            onClick={endCall}
            className="w-9 h-9 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRoomStore } from '@/hooks/useStore';
import { useRoomTimer } from '@/hooks/useRoomTimer';

interface RoomHeaderProps {
  inviteToken: string;
}

export default function RoomHeader({ inviteToken }: RoomHeaderProps) {
  const expiresAt = useRoomStore((s) => s.expiresAt);
  const memberCount = useRoomStore((s) => s.memberCount);
  const maxMembers = useRoomStore((s) => s.maxMembers);
  const roomStatus = useRoomStore((s) => s.roomStatus);
  const { timeLeft } = useRoomTimer(expiresAt);

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/r/${inviteToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Lấy maxMembers từ joined data: store không lưu → đọc qua roomStatus? Tạm show count
  return (
    <header className="border-b border-accent-400/20 bg-gradient-to-r from-dark-900/90 to-dark-950/90 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent-500/30 animate-heart-beat">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-white text-sm truncate flex items-center gap-2">
                <span className="gradient-text">Phòng Kín</span>
                <span className="text-accent-400 animate-pulse">♥</span>
              </div>
              <div className="text-xs text-accent-300/70 flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gradient-to-r from-accent-400 to-accent-500 rounded-full animate-pulse" />
                  {memberCount}/{maxMembers} người
                </span>
                <span>·</span>
                <span>Phòng {roomStatus === 'FULL' ? 'đầy' : 'mở'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-gradient-to-br from-dark-700/80 to-dark-800/80 rounded-lg px-3 py-1.5 border border-accent-400/20">
              <svg className="w-4 h-4 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-mono text-accent-300">{timeLeft}</span>
            </div>

            <button
              onClick={handleCopy}
              className="btn btn-primary text-sm py-1.5 flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Đã copy ♥
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy link
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

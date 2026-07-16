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
  const maxMembers = useRoomStore((s) => 0); // We don't store maxMembers in store yet, fallback below
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
    <header className="border-b border-dark-800 bg-dark-900/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-600 to-accent-800 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-white text-sm truncate">Phòng Kín</div>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  {memberCount} người
                </span>
                <span>·</span>
                <span>Phòng {roomStatus === 'FULL' ? 'đầy' : 'mở'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-dark-800 rounded-lg px-3 py-1.5">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-mono text-gray-300">{timeLeft}</span>
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
                  Đã copy
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

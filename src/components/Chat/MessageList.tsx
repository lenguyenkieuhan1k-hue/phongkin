'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useMessageStore } from '@/hooks/useStore';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  guestId: string;
}

export default function MessageList({ guestId }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const messages = useMessageStore((s) => s.messages);
  const isAtBottomRef = useRef(true);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Track scroll position để biết user đang ở đâu
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // User ở cuối nếu scrollTop + clientHeight >= scrollHeight - 100px
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    if (isAtBottom) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      onScroll={handleScroll}
    >
      {messages.length === 0 && (
        <div className="text-center py-16 space-y-4">
          {/* Big heart animation */}
          <div className="relative inline-block">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-accent-500/20 to-accent-600/20 flex items-center justify-center animate-heart-beat">
              <svg className="w-10 h-10 text-accent-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            {/* Floating hearts around */}
            <div className="absolute -top-2 -left-4 text-2xl text-accent-300/40 animate-float" style={{ animationDelay: '0s' }}>♥</div>
            <div className="absolute -top-1 -right-4 text-xl text-accent-400/30 animate-float" style={{ animationDelay: '1s' }}>♡</div>
            <div className="absolute -bottom-2 -left-2 text-lg text-accent-300/30 animate-float" style={{ animationDelay: '2s' }}>♥</div>
          </div>
          <p className="text-gray-500 text-lg font-medium">Chưa có tin nhắn nào</p>
          <p className="text-gray-600 text-sm">Hãy gửi lời chào đầu tiên ♥</p>
        </div>
      )}

      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          isOwn={m.senderGuestId === guestId}
          formatTime={formatTime}
        />
      ))}
      <TypingIndicator />
      <div ref={scrollEndRef} />
    </div>
  );
}

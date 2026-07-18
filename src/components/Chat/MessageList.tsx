'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useMessageStore } from '@/hooks/useStore';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  guestId: string;
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function MessageList({ guestId }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const messages = useMessageStore((s) => s.messages);
  const typingUsers = useMessageStore((s) => s.typingUsers);

  // Sticky-bottom: true = user đang ở đáy → auto follow
  // false = user kéo lên đọc → KHÔNG ép scroll
  const stickyRef = useRef(true);
  const [, force] = useState(0);

  // === Sentinel-based sticky detection ===
  useEffect(() => {
    const container = containerRef.current;
    const sentinel = sentinelRef.current;
    if (!container || !sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const wasSticky = stickyRef.current;
        stickyRef.current = entry.isIntersecting;
        if (entry.isIntersecting && !wasSticky) {
          force((x) => x + 1);
        }
      },
      {
        root: container,
        rootMargin: '0px 0px 100px 0px',
        threshold: 0,
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // === Auto-scroll: chỉ khi sticky ===
  // Dep `messages` (không phải messages.length) vì khi replace optimistic bằng
  // server message: length giữ nguyên nhưng array reference đổi → vẫn phải scroll
  useEffect(() => {
    if (!stickyRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [messages, typingUsers.length]);

  const handleScroll = useCallback(() => {
    force((x) => x + 1);
  }, []);

  const jumpToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    stickyRef.current = true;
    force((x) => x + 1);
  }, []);

  const showJumpButton = !stickyRef.current && messages.length > 0;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="
        flex-1 min-h-0 overflow-y-auto relative
        px-4 pt-2
        pb-[calc(0.75rem+env(safe-area-inset-bottom))]
        space-y-3
        overscroll-behavior-y-contain
        scroll-smooth-mobile
      "
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {messages.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <div className="relative inline-block">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-accent-500/20 to-accent-600/20 flex items-center justify-center animate-heart-beat">
              <svg className="w-10 h-10 text-accent-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
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
      <div ref={sentinelRef} style={{ height: '1px' }} aria-hidden />

      {showJumpButton && (
        <button
          onClick={jumpToBottom}
          className="
            sticky bottom-3 left-full -ml-12 z-10
            w-10 h-10 rounded-full
            bg-accent-500 hover:bg-accent-600
            text-white shadow-lg
            flex items-center justify-center
            animate-slideUp
            tap-highlight-transparent
          "
          aria-label="Cuộn xuống tin nhắn mới nhất"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useMessageStore } from '@/hooks/useStore';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  guestId: string;
}

export default function MessageList({ guestId }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const messages = useMessageStore((s) => s.messages);
  const isAtBottomRef = useRef(true);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Smart auto-scroll: chỉ scroll xuống nếu user đang ở cuối
  const scrollToBottom = useCallback((force = false) => {
    const container = containerRef.current;
    if (!container) return;

    if (force || isAtBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Auto-scroll khi có tin nhắn mới
  useEffect(() => {
    // Debounce scroll - tránh scroll quá nhiều lần
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [messages.length, scrollToBottom]);

  // Track scroll position để biết user đang ở đâu
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // User ở cuối nếu scrollTop + clientHeight >= scrollHeight - 100px
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      onScroll={handleScroll}
    >
      {messages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Chưa có tin nhắn nào. Hãy gửi lời chào!</p>
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
    </div>
  );
}

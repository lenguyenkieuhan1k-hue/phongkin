'use client';

import { useRef, useEffect } from 'react';
import { usePresenceStore } from '@/hooks/useStore';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  roomId: string;
  senderId: string;
  sender?: {
    id: string;
    darkId: string;
    handle: string;
  };
  type: string;
  body?: string;
  attachments?: any[];
  createdAt: string;
  recalledAt?: string | null;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  typingUsers: string[];
}

export default function MessageList({
  messages,
  currentUserId,
  typingUsers,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onlineUsers = usePresenceStore((state) => state.onlineUsers);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const otherTypingUsers = typingUsers.filter((u) => u !== 'current-user');

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No messages yet. Say hello!</p>
        </div>
      )}

      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.senderId === currentUserId}
          formatTime={formatTime}
        />
      ))}

      {otherTypingUsers.length > 0 && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>{otherTypingUsers[0]} is typing...</span>
        </div>
      )}
    </div>
  );
}

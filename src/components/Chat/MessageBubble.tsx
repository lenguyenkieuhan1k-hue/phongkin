'use client';

import { useState } from 'react';
import { usePresenceStore } from '@/hooks/useStore';
import MessageContent from './MessageContent';

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

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  formatTime: (date: string) => string;
}

export default function MessageBubble({ message, isOwn, formatTime }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const onlineUsers = usePresenceStore((state) => state.onlineUsers);

  const isRecalled = !!message.recalledAt;
  const senderStatus = message.sender?.darkId && onlineUsers.has(message.sender.darkId) ? 'online' : 'offline';

  const handleRecall = () => {
    // Emit recall event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('recall-message', { detail: { messageId: message.id } }));
    }
  };

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-mono text-gray-500">
              {message.sender?.darkId || 'Unknown'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                senderStatus === 'online' ? 'bg-green-500' : 'bg-gray-600'
              }`}
            />
          </div>
        )}

        <div
          className={`relative rounded-2xl px-4 py-2.5 ${
            isOwn
              ? 'bg-accent-600 text-white rounded-br-md'
              : 'bg-dark-800 text-gray-100 rounded-bl-md'
          } ${isRecalled ? 'opacity-50 italic' : ''}`}
        >
          {isRecalled ? (
            <p className="text-sm text-gray-400 italic">
              This message was recalled
            </p>
          ) : (
            <MessageContent message={message} isOwn={isOwn} />
          )}
        </div>

        <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'} px-1`}>
          <span className="text-[10px] text-gray-600">
            {formatTime(message.createdAt)}
          </span>
          {isOwn && (
            <span className="text-[10px] text-gray-600">
              {isRead ? 'Read' : 'Sent'}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {isOwn && !isRecalled && (
        <div
          className={`order-1 flex items-center self-center mr-2 transition-opacity ${
            showActions ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={handleRecall}
            className="p-1.5 rounded-lg hover:bg-dark-800 text-gray-500 hover:text-gray-300 transition-colors"
            title="Recall message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

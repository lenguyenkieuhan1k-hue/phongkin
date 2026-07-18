'use client';

import { memo, useState } from 'react';
import MessageContent from './MessageContent';

interface Message {
  id: string;
  roomId: string;
  senderGuestId: string;
  senderHandle: string;
  type: string;
  body?: string;
  attachments?: any[];
  createdAt: string;
  recalledAt?: string | null;
  _optimistic?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  formatTime: (date: string) => string;
}

function MessageBubble({ message, isOwn, formatTime }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const isRecalled = !!message.recalledAt;
  const isOptimistic = !!(message as any)._optimistic;

  const handleRecall = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('phongkin-recall', { detail: { messageId: message.id } }));
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
            <span className="text-xs text-accent-400 font-medium">
              <span className="inline-flex items-center gap-1">
                <svg className="w-3 h-3 text-accent-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                {message.senderHandle || 'Ẩn danh'}
              </span>
            </span>
          </div>
        )}

        <div
          className={`relative rounded-2xl px-4 py-2.5 border-2 border-red-500 ${
            isOwn
              ? 'bg-gradient-to-br from-accent-500 to-accent-600 text-white rounded-br-md shadow-lg shadow-accent-500/25'
              : 'bg-gradient-to-br from-dark-700 to-dark-800 text-gray-100 rounded-bl-md border border-accent-400/10'
          } ${isRecalled ? 'opacity-50 italic' : ''} ${isOptimistic ? 'opacity-70' : ''}`}
        >
          {isRecalled ? (
            <p className="text-sm text-gray-400 italic">Tin nhắn đã được thu hồi</p>
          ) : (
            <MessageContent message={message} isOwn={isOwn} />
          )}
        </div>

        <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'} px-1`}>
          <span className="text-[10px] text-gray-500">{formatTime(message.createdAt)}</span>
          {isOwn && <span className="text-[10px] text-accent-400">♥</span>}
        </div>
      </div>

      {isOwn && !isRecalled && (
        <div
          className={`order-1 flex items-center self-center mr-2 transition-opacity ${
            showActions ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={handleRecall}
            className="p-1.5 rounded-lg hover:bg-accent-500/20 text-gray-500 hover:text-accent-400 transition-colors"
            title="Thu hồi"
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

export default memo(MessageBubble);

'use client';

import { useState, useMemo } from 'react';
import { useRoomStore, useMessageStore } from '@/hooks/useStore';
import { useSocket } from '@/hooks/useSocket';
import InviteModal from '@/components/Invite/InviteModal';
import { IncomingInviteProvider } from '@/components/Invite/IncomingInviteModal';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserHeader from './UserHeader';

interface ChatScreenProps {
  session: any;
  onLogout: () => void;
}

const EMPTY_ARRAY: never[] = [];

export default function ChatScreen({ session, onLogout }: ChatScreenProps) {
  return (
    <IncomingInviteProvider sessionToken={session.token}>
      <ChatScreenInner session={session} onLogout={onLogout} />
    </IncomingInviteProvider>
  );
}

function ChatScreenInner({ session, onLogout }: ChatScreenProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Initialize socket connection
  useSocket(session);

  const currentRoomId = useRoomStore((state) => state.currentRoomId);
  const messagesMap = useMessageStore((state) => state.messages);
  const typingMap = useMessageStore((state) => state.typingUsers);

  const messages = useMemo(() => {
    const roomId = currentRoomId || '';
    return messagesMap.get(roomId) || EMPTY_ARRAY;
  }, [currentRoomId, messagesMap]);

  const typingUsers = useMemo(() => {
    const roomId = currentRoomId || '';
    return typingMap.get(roomId) || EMPTY_ARRAY;
  }, [currentRoomId, typingMap]);

  return (
    <div className="min-h-screen flex flex-col bg-dark-950">
      <UserHeader
        darkId={session.darkId}
        expiresAt={session.expiresAt}
        onInviteClick={() => setShowInviteModal(true)}
        onLogout={onLogout}
      />

      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {currentRoomId ? (
          <>
            <div className="flex-1 overflow-hidden">
              <MessageList
                messages={messages}
                currentUserId={session.id}
                typingUsers={typingUsers}
              />
            </div>
            <MessageInput roomId={currentRoomId} />
          </>
        ) : (
          <EmptyState onInviteClick={() => setShowInviteModal(true)} />
        )}
      </main>

      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          inviterDarkId={session.darkId}
          sessionToken={session.token}
        />
      )}
    </div>
  );
}

function EmptyState({ onInviteClick }: { onInviteClick: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-300 mb-2">
        No active conversations
      </h2>
      <p className="text-gray-500 mb-8 max-w-sm">
        Share your Dark ID with someone to start a conversation, or enter their Dark ID to connect.
      </p>
      <button
        onClick={onInviteClick}
        className="btn btn-primary"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Start a conversation
      </button>
    </div>
  );
}

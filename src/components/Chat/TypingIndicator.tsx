'use client';

import { useMessageStore, useRoomStore } from '@/hooks/useStore';

export default function TypingIndicator() {
  const typingUsers = useMessageStore((s) => s.typingUsers);
  const guestId = useRoomStore((s) => s.guestId);
  const members = useRoomStore((s) => s.members);

  const others = typingUsers.filter((id) => id !== guestId);
  if (others.length === 0) return null;

  const getName = (id: string) => members.find((m) => m.guestId === id)?.handle ?? id;

  const label = others.length === 1
    ? `${getName(others[0])} đang nhập...`
    : others.length === 2
    ? `${getName(others[0])} và ${getName(others[1])} đang nhập...`
    : `${others.length} người đang nhập...`;

  return (
    <div className="px-4 py-1.5 flex items-center gap-1.5 text-xs text-gray-500">
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="animate-pulse">{label}</span>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoomHeader from './RoomHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import LoadingScreen from './LoadingScreen';
import { useSocket } from '@/hooks/useSocket';
import { useRoomStore } from '@/hooks/useStore';

interface ChatScreenProps {
  inviteToken: string;
}

interface RoomInfo {
  id: string;
  inviteToken: string;
  duration: number;
  maxMembers: number;
  status: 'ACTIVE' | 'FULL' | 'EXPIRED';
  expiresAt: string;
  isOwner: boolean;
}

interface Member {
  handle: string;
  isOwner: boolean;
}

interface JoinResponse {
  room?: RoomInfo;
  guestId?: string;
  handle?: string;
  memberCount?: number;
  members?: Member[];
  error?: string;
  code?: 'NOT_FOUND' | 'EXPIRED' | 'FULL' | 'ALREADY_JOINED';
}

type Phase = 'HANDLE' | 'JOINING' | 'CHAT' | 'ERROR';

const HANDLE_KEY = (token: string) => `pk:handle:${token}`;

export default function ChatScreen({ inviteToken }: ChatScreenProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('HANDLE');
  const [handle, setHandle] = useState('');
  const [handleError, setHandleError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);

  // Đọc handle đã lưu trong localStorage (nếu user F5 hoặc quay lại)
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(HANDLE_KEY(inviteToken)) : null;
    if (saved) setHandle(saved);
  }, [inviteToken]);

  const submitHandle = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = handle.trim();
    if (!trimmed) {
      setHandleError('Vui lòng nhập biệt danh.');
      return;
    }
    if (trimmed.length > 24) {
      setHandleError('Biệt danh tối đa 24 ký tự.');
      return;
    }
    setHandleError(null);
    setPhase('JOINING');
    try {
      const r = await fetch(`/api/rooms/${inviteToken}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: trimmed }),
      });
      const data = (await r.json()) as JoinResponse;
      if (!r.ok || !data.room || !data.guestId) {
        const msg =
          data.code === 'FULL'
            ? 'Phòng đã đủ số lượng thành viên.'
            : data.code === 'EXPIRED'
            ? 'Phòng đã hết hạn.'
            : data.code === 'NOT_FOUND'
            ? 'Phòng không tồn tại.'
            : data.error || 'Không thể vào phòng.';
        setGlobalError(msg);
        setPhase('ERROR');
        return;
      }
      localStorage.setItem(HANDLE_KEY(inviteToken), trimmed);
      setRoom(data.room);
      setGuestId(data.guestId);
      useRoomStore.getState().setRoom({
        roomId: data.room.id,
        inviteToken: data.room.inviteToken,
        guestId: data.guestId,
        maxMembers: data.room.maxMembers,
        expiresAt: data.room.expiresAt,
        status: data.room.status,
      });
      setPhase('CHAT');
    } catch {
      setGlobalError('Lỗi mạng. Vui lòng thử lại.');
      setPhase('ERROR');
    }
  };

  // Khi có guestId → connect socket
  useSocket(guestId && phase === 'CHAT' ? { roomToken: inviteToken, guestId } : null);

  // Form nhập biệt danh
  if (phase === 'HANDLE') {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-white">Chào mừng vào phòng</h1>
            <p className="text-gray-400 mt-1 text-sm">
              Chọn một biệt danh để mọi người nhận ra bạn trong cuộc trò chuyện.
            </p>
          </div>
          <form onSubmit={submitHandle} className="space-y-4">
            <div>
              <label htmlFor="handle" className="block text-sm font-medium text-gray-300 mb-2">
                Biệt danh của bạn
              </label>
              <input
                id="handle"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                maxLength={24}
                autoFocus
                placeholder="VD: Mèo Mun, An, ..."
                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500"
              />
              <p className="text-xs text-gray-500 mt-1">Tối đa 24 ký tự.</p>
            </div>
            {handleError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2">
                {handleError}
              </div>
            )}
            <button type="submit" className="w-full btn btn-primary py-3 rounded-xl font-semibold">
              Vào phòng
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (phase === 'JOINING') return <LoadingScreen />;

  if (phase === 'ERROR') {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Không thể vào phòng</h1>
          <p className="text-gray-400">{globalError}</p>
          <button onClick={() => router.push('/')} className="btn btn-primary w-full">
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (!room || !guestId) return <LoadingScreen />;

  return (
    <div className="min-h-screen flex flex-col bg-dark-950">
      <RoomHeader inviteToken={inviteToken} />
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex-1 overflow-hidden">
          <MessageList guestId={guestId} />
        </div>
        <MessageInput />
      </main>
    </div>
  );
}
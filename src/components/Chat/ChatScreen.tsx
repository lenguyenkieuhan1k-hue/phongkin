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
      <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-accent-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Floating hearts background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[15%] text-4xl text-accent-400/20 animate-float" style={{ animationDelay: '0s' }}>♥</div>
          <div className="absolute top-[20%] right-[20%] text-3xl text-accent-300/15 animate-float" style={{ animationDelay: '1s' }}>♡</div>
          <div className="absolute top-[60%] left-[10%] text-5xl text-accent-500/10 animate-float" style={{ animationDelay: '2s' }}>♥</div>
          <div className="absolute top-[70%] right-[15%] text-4xl text-accent-400/20 animate-float" style={{ animationDelay: '3s' }}>♡</div>
          <div className="absolute top-[40%] left-[5%] text-3xl text-accent-300/15 animate-float" style={{ animationDelay: '4s' }}>♥</div>
          <div className="absolute top-[85%] left-[25%] text-4xl text-accent-400/10 animate-float" style={{ animationDelay: '5s' }}>♡</div>
          <div className="absolute top-[15%] right-[10%] text-5xl text-accent-500/15 animate-float" style={{ animationDelay: '2.5s' }}>♥</div>
          <div className="absolute top-[50%] right-[5%] text-3xl text-accent-300/10 animate-float" style={{ animationDelay: '1.5s' }}>♡</div>
        </div>

        <div className="card p-8 max-w-md w-full space-y-6 relative z-10 romantic-glow">
          {/* Heart icon header */}
          <div className="text-center mb-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-500/30 mb-4">
              <svg className="w-8 h-8 text-white animate-heart-beat" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold gradient-text">Chào mừng vào phòng</h1>
            <p className="text-gray-400 mt-2 text-sm">
              Chọn một biệt danh để mọi người nhận ra bạn trong cuộc trò chuyện.
            </p>
          </div>

          <form onSubmit={submitHandle} className="space-y-5">
            <div>
              <label htmlFor="handle" className="block text-sm font-medium text-gray-300 mb-2">
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Biệt danh của bạn
                </span>
              </label>
              <input
                id="handle"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                maxLength={24}
                autoFocus
                placeholder="VD: Mèo Mun, An, ..."
                className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-600 text-white placeholder-gray-500 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20 transition-all duration-200"
              />
              <p className="text-xs text-gray-500 mt-1">Tối đa 24 ký tự.</p>
            </div>
            {handleError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2">
                {handleError}
              </div>
            )}
            <button type="submit" className="w-full btn btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
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
      <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-accent-950 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center space-y-5 romantic-glow">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-accent-500/20 to-accent-600/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 relative">
      {/* Floating hearts background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[5%] left-[10%] text-4xl text-accent-400/10 animate-float" style={{ animationDelay: '0s' }}>♥</div>
        <div className="absolute top-[15%] right-[15%] text-5xl text-accent-300/8 animate-float" style={{ animationDelay: '1.5s' }}>♡</div>
        <div className="absolute top-[30%] left-[5%] text-6xl text-accent-500/6 animate-float" style={{ animationDelay: '2s' }}>♥</div>
        <div className="absolute top-[50%] right-[8%] text-4xl text-accent-400/10 animate-float" style={{ animationDelay: '3s' }}>♡</div>
        <div className="absolute top-[70%] left-[15%] text-5xl text-accent-300/8 animate-float" style={{ animationDelay: '4s' }}>♥</div>
        <div className="absolute top-[85%] right-[20%] text-4xl text-accent-400/6 animate-float" style={{ animationDelay: '5s' }}>♡</div>
      </div>

      <RoomHeader inviteToken={inviteToken} />
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative z-10">
        <div className="flex-1 overflow-hidden">
          <MessageList guestId={guestId} />
        </div>
        <MessageInput />
      </main>
    </div>
  );
}
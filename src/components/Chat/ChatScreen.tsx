'use client';

import { useEffect, useMemo, useState } from 'react';
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
type Theme = 'meeting' | 'romance';

const HANDLE_KEY = (token: string) => `pk:handle:${token}`;
const THEME_KEY = (token: string) => `pk:theme:${token}`;

const THEME_OPTIONS: { value: Theme; label: string; desc: string; emoji: string }[] = [
  {
    value: 'meeting',
    label: 'Cuộc họp bí mật',
    desc: 'Giao diện lịch sự, không màu hồng',
    emoji: '💼',
  },
  {
    value: 'romance',
    label: 'Tình yêu bí mật',
    desc: 'Giao diện hồng lãng mạn',
    emoji: '💕',
  },
];

export default function ChatScreen({ inviteToken }: ChatScreenProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('HANDLE');
  const [handle, setHandle] = useState('');
  const [theme, setTheme] = useState<Theme>('meeting');
  const [handleError, setHandleError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);

  // Đọc handle + theme đã lưu trong localStorage (nếu user F5 hoặc quay lại)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedHandle = localStorage.getItem(HANDLE_KEY(inviteToken));
    if (savedHandle) setHandle(savedHandle);
    const savedTheme = localStorage.getItem(THEME_KEY(inviteToken)) as Theme | null;
    const nextTheme: Theme = savedTheme === 'romance' ? 'romance' : 'meeting';
    setTheme(nextTheme);
    // Áp dụng theme NGAY tại popup để user preview được trước khi vào phòng
    document.documentElement.setAttribute('data-theme', nextTheme);
  }, [inviteToken]);

  // Đổi theme live khi user chọn (preview ngay trong popup)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
      localStorage.setItem(THEME_KEY(inviteToken), theme);
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

  // Memoize session object to avoid socket reconnect on every render
  const socketSession = useMemo(
    () => (guestId && phase === 'CHAT' ? { roomToken: inviteToken, guestId } : null),
    [inviteToken, guestId, phase]
  );
  useSocket(socketSession);

  // Form nhập biệt danh + chọn theme
  if (phase === 'HANDLE') {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Floating hearts background (ẩn nếu theme = meeting) */}
        {theme === 'romance' && (
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
        )}

        <div className="card p-8 max-w-md w-full space-y-6 relative z-10 romantic-glow">
          {/* Header icon */}
          <div className="text-center mb-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-500/30 mb-4">
              {theme === 'romance' ? (
                <svg className="w-8 h-8 text-white animate-heart-beat" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              ) : (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>
            <h1 className="text-2xl font-bold gradient-text">Chào mừng vào phòng</h1>
            <p className="text-gray-400 mt-2 text-sm">
              Chọn biệt danh và giao diện phù hợp với bạn.
            </p>
          </div>

          <form onSubmit={submitHandle} className="space-y-5">
            {/* Biệt danh */}
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
                inputMode="text"
                autoComplete="off"
                enterKeyHint="go"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                maxLength={24}
                autoFocus
                placeholder="VD: Mèo Mun, An, ..."
                className="w-full px-4 py-3 text-base rounded-xl bg-dark-800/80 border border-dark-600 text-white placeholder-gray-500 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20 transition-all duration-200"
              />
              <p className="text-xs text-gray-500 mt-1">Tối đa 24 ký tự.</p>
            </div>

            {/* Theme picker */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 15.343V9.657m0 0a2 2 0 00-2-2H7.657m2.343 2.343L7.657 9.657m5.343 5.343L17.657 12m0 0a2 2 0 012-2h.343a2 2 0 012 2v.343a2 2 0 01-2 2H17.657z" />
                  </svg>
                  Giao diện phòng
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={`
                      p-3 rounded-xl text-left transition-all duration-200
                      border-2 tap-highlight-transparent
                      ${theme === opt.value
                        ? 'border-accent-400 bg-accent-400/10 shadow-lg shadow-accent-500/20'
                        : 'border-dark-600 bg-dark-800/40 hover:border-dark-500'
                      }
                    `}
                  >
                    <div className="text-2xl mb-1">{opt.emoji}</div>
                    <div className="text-sm font-semibold text-white">{opt.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {handleError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2">
                {handleError}
              </div>
            )}
            <button type="submit" className="w-full btn btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
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
      <div className="min-h-dvh bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center space-y-5 romantic-glow">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-accent-500/20 to-accent-600/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="min-h-dvh flex flex-col bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 relative">
      {/* Floating hearts background (ẩn nếu theme = meeting) */}
      {theme === 'romance' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[5%] left-[10%] text-4xl text-accent-400/10 animate-float" style={{ animationDelay: '0s' }}>♥</div>
          <div className="absolute top-[15%] right-[15%] text-5xl text-accent-300/8 animate-float" style={{ animationDelay: '1.5s' }}>♡</div>
          <div className="absolute top-[30%] left-[5%] text-6xl text-accent-500/6 animate-float" style={{ animationDelay: '2s' }}>♥</div>
          <div className="absolute top-[50%] right-[8%] text-4xl text-accent-400/10 animate-float" style={{ animationDelay: '3s' }}>♡</div>
          <div className="absolute top-[70%] left-[15%] text-5xl text-accent-300/8 animate-float" style={{ animationDelay: '4s' }}>♥</div>
          <div className="absolute top-[85%] right-[20%] text-4xl text-accent-400/6 animate-float" style={{ animationDelay: '5s' }}>♡</div>
        </div>
      )}

      <RoomHeader inviteToken={inviteToken} />
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative z-10 pb-safe">
        <div className="flex-1 overflow-hidden">
          <MessageList guestId={guestId} />
        </div>
        <MessageInput />
      </main>
    </div>
  );
}

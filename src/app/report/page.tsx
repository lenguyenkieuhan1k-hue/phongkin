'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/Chat/LoadingScreen';
import { useSocket } from '@/hooks/useSocket';
import { useRoomStore } from '@/hooks/useStore';
import MessageList from '@/components/Chat/MessageList';
import MessageInput from '@/components/Chat/MessageInput';

const PASSWORD_KEY = 'dr:report:pwd';
const REPORT_DUMMY_PWD = 'verified'; // Marker - real password checked server-side

export default function ReportPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'PASSWORD' | 'HANDLE' | 'JOINING' | 'CHAT'>('PASSWORD');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [handle, setHandle] = useState('');
  const [handleError, setHandleError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);

  // Load saved session
  useEffect(() => {
    if (localStorage.getItem(PASSWORD_KEY) === REPORT_DUMMY_PWD) {
      setPhase('HANDLE');
      const savedHandle = localStorage.getItem('dr:report:handle');
      if (savedHandle) setHandle(savedHandle);
    }
  }, []);

  const verifyPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setPasswordError(null);
    // Verify password server-side via a probe (using empty handle returns 401 if wrong)
    try {
      const r = await fetch('/api/report/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, handle: '__probe__' }),
      });
      if (r.status === 401) {
        setPasswordError('Mật khẩu không đúng.');
        return;
      }
      // 200 or 400 (handle invalid) both mean password was right
      localStorage.setItem(PASSWORD_KEY, REPORT_DUMMY_PWD);
      setPhase('HANDLE');
    } catch {
      setPasswordError('Lỗi mạng. Vui lòng thử lại.');
    }
  };

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
    localStorage.setItem('dr:report:handle', trimmed);

    try {
      const r = await fetch('/api/report/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: REPORT_DUMMY_PWD, handle: trimmed }),
      });
      const data = await r.json();
      if (!r.ok || !data.guestId) {
        setGlobalError(data.error || 'Không thể vào phòng báo cáo.');
        setPhase('HANDLE');
        return;
      }
      setGuestId(data.guestId);
      useRoomStore.getState().setRoom({
        roomId: data.roomId,
        inviteToken: 'REPORT_ROOM',
        guestId: data.guestId,
        maxMembers: 999,
        expiresAt: data.expiresAt,
        status: data.roomStatus,
      });
      setPhase('CHAT');
    } catch {
      setGlobalError('Lỗi mạng. Vui lòng thử lại.');
      setPhase('HANDLE');
    }
  };

  // Memoize session object to avoid socket reconnect on every render
  const socketSession = useMemo(
    () => (guestId && phase === 'CHAT' ? { roomToken: 'REPORT_ROOM', guestId } : null),
    [guestId, phase]
  );
  useSocket(socketSession);

  // Password screen
  if (phase === 'PASSWORD') {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-dark-950 via-dark-900 to-accent-950 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full space-y-6 romantic-glow">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-500/30 mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold gradient-text">Khu vực Báo cáo</h1>
            <p className="text-gray-400 mt-2 text-sm">
              Nhập mật khẩu để truy cập phòng báo cáo công việc
            </p>
          </div>

          <form onSubmit={verifyPassword} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                inputMode="text"
                autoComplete="current-password"
                enterKeyHint="go"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="Nhập mật khẩu..."
                className="w-full px-4 py-3 text-base rounded-xl bg-dark-800/80 border border-dark-600 text-white placeholder-gray-500 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20 transition-all duration-200"
              />
            </div>
            {passwordError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2">
                {passwordError}
              </div>
            )}
            <button type="submit" className="w-full btn btn-primary py-3 rounded-xl font-semibold">
              Xác nhận
            </button>
          </form>

          <button
            onClick={() => router.push('/')}
            className="w-full text-center text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            ← Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Handle screen
  if (phase === 'HANDLE') {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-dark-950 via-dark-900 to-accent-950 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full space-y-6 romantic-glow">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-500/30 mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold gradient-text">Phòng Báo cáo</h1>
            <p className="text-gray-400 mt-2 text-sm">
              Nhập biệt danh để tham gia phòng báo cáo công việc
            </p>
          </div>

          {globalError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2">
              {globalError}
            </div>
          )}

          <form onSubmit={submitHandle} className="space-y-5">
            <div>
              <label htmlFor="handle" className="block text-sm font-medium text-gray-300 mb-2">
                Biệt danh
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
                placeholder="VD: Nhân viên A..."
                className="w-full px-4 py-3 text-base rounded-xl bg-dark-800/80 border border-dark-600 text-white placeholder-gray-500 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20 transition-all duration-200"
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

          <button
            onClick={() => {
              localStorage.removeItem(PASSWORD_KEY);
              setPhase('PASSWORD');
              setPassword('');
            }}
            className="w-full text-center text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            Đổi tài khoản
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'JOINING') return <LoadingScreen />;

  // Chat screen
  if (phase === 'CHAT' && guestId) {
    return (
      <div className="min-h-dvh flex flex-col bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 relative">
        {/* Header */}
        <header className="glass px-4 py-3 flex items-center justify-between relative z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold text-white">Phòng Báo cáo</h1>
              <p className="text-xs text-gray-400">Báo cáo công việc hàng ngày</p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem(PASSWORD_KEY);
              localStorage.removeItem('dr:report:handle');
              window.location.href = '/report';
            }}
            className="p-2 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </header>

        {/* Chat area */}
        <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative z-10 pb-safe">
          <div className="flex-1 overflow-hidden">
            <MessageList guestId={guestId} />
          </div>
          <MessageInput />
        </main>
      </div>
    );
  }

  return <LoadingScreen />;
}

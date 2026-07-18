'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useRoomStore, useMessageStore } from './useStore';
import { SOCKET_EVENTS } from '@/socket/events';
import { useToast } from '@/components/Toast';

let socket: Socket | null = null;

interface SessionData {
  roomToken: string;
  guestId: string;
}

export function useSocket(session: SessionData | null) {
  const setRoom = useRoomStore((s) => s.setRoom);
  const setMemberCount = useRoomStore((s) => s.setMemberCount);
  const setRoomStatus = useRoomStore((s) => s.setRoomStatus);
  const clearRoom = useRoomStore((s) => s.clearRoom);
  const setMessages = useMessageStore((s) => s.setMessages);
  const addMessage = useMessageStore((s) => s.addMessage);
  const updateMessage = useMessageStore((s) => s.updateMessage);
  const removeMessage = useMessageStore((s) => s.removeMessage);
  const setTyping = useMessageStore((s) => s.setTyping);
  const router = useRouter();
  const toast = useToast();
  const showToast = toast.toast;
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (!session?.roomToken || !session?.guestId) {
      if (socket) {
        socket.disconnect();
        socket = null;
        if (typeof window !== 'undefined') (window as any).__socket = null;
      }
      return;
    }

    // Auto-detect: nếu ở production thì dùng https:// của chính origin (cùng host với API)
    // Render free tier có thể block WS upgrade → bỏ transports:['websocket'] để có polling fallback
    const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const wsUrl = isProd
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000');

    if (!socket) {
      socket = io(wsUrl, {
        auth: { roomToken: session.roomToken, guestId: session.guestId },
        transports: ['polling', 'websocket'], // polling first → ổn định qua Render proxy
        upgrade: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        path: '/socket.io',
      });

      if (typeof window !== 'undefined') {
        (window as any).__socket = socket;
      }
    }

    socket.on('connect', () => {
      console.log('[useSocket] connected');
      socket?.emit(SOCKET_EVENTS.ROOM_JOIN);
    });

    socket.on('disconnect', (reason) => {
      console.log('[useSocket] disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[useSocket] connection error:', err.message);
    });

    socket.on(SOCKET_EVENTS.ROOM_JOINED, (data: {
      roomId: string;
      inviteToken: string;
      messages: any[];
      room: { id: string; duration: number; maxMembers: number; status: 'ACTIVE' | 'FULL' | 'EXPIRED'; expiresAt: string };
      memberCount: number;
      members: any[];
      myGuestId: string;
    }) => {
      setRoom({
        roomId: data.roomId,
        inviteToken: data.inviteToken,
        guestId: data.myGuestId,
        maxMembers: data.room.maxMembers,
        members: data.members,
        expiresAt: data.room.expiresAt,
        status: data.room.status,
      });
      setMemberCount(data.memberCount);
      setMessages(data.messages);
    });

    socket.on(SOCKET_EVENTS.ROOM_MEMBER_JOINED, (data: { guestId: string; handle: string; memberCount: number }) => {
      setMemberCount(data.memberCount);
      const current = useRoomStore.getState().members;
      if (!current.find((m) => m.guestId === data.guestId)) {
        useRoomStore.setState({ members: [...current, { guestId: data.guestId, handle: data.handle, isOwner: false }] });
      }
    });

    socket.on(SOCKET_EVENTS.ROOM_MEMBER_LEFT, (data: { guestId: string; memberCount?: number }) => {
      if (data.memberCount !== undefined) setMemberCount(data.memberCount);
      useRoomStore.setState({ members: useRoomStore.getState().members.filter((m) => m.guestId !== data.guestId) });
    });

    socket.on(SOCKET_EVENTS.ROOM_CLOSED, (data: { roomId: string; reason: string }) => {
      console.log('[useSocket] room closed:', data);
      setRoomStatus('EXPIRED');
      showToast('Phòng đã đóng. Dữ liệu sẽ được xóa.', 'info');
      clearRoom();
      router.replace('/');
    });

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, (message: any) => {
      const state = useMessageStore.getState();
      // 1) Exact id match (server reload hoặc re-broadcast)
      if (state.messages.some((m) => m.id === message.id)) return;

      // 2) Replace optimistic: tìm bubble tạm có cùng senderGuestId + body + trong vòng 10s
      const idx = state.messages.findIndex((m) => {
        if (!(m as any)._optimistic) return false;
        if (m.senderGuestId !== message.senderGuestId) return false;
        if ((m.body || '') !== (message.body || '')) return false;
        const delta = Math.abs(new Date(message.createdAt).getTime() - new Date(m.createdAt).getTime());
        return delta < 10000;
      });
      if (idx !== -1) {
        useMessageStore.setState((s) => ({
          messages: s.messages.map((m, i) => (i === idx ? { ...message, _optimistic: false } : m)),
        }));
        return;
      }

      // 3) Brand-new message (từ user khác) — add bình thường
      addMessage(message);
    });

    socket.on(SOCKET_EVENTS.MESSAGE_RECALLED, (data: { messageId: string }) => {
      updateMessage(data.messageId, { recalledAt: new Date().toISOString() });
    });

    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, (data: { messageId: string }) => {
      removeMessage(data.messageId);
    });

    socket.on(SOCKET_EVENTS.TYPING_UPDATE, (data: { roomId: string; guestId: string; isTyping: boolean }) => {
      const current = useMessageStore.getState().typingUsers;
      if (data.isTyping) {
        if (!current.includes(data.guestId)) {
          setTyping([...current, data.guestId]);
        }
        if (typingTimerRef.current[data.guestId]) {
          clearTimeout(typingTimerRef.current[data.guestId]);
        }
        typingTimerRef.current[data.guestId] = setTimeout(() => {
          const cur = useMessageStore.getState().typingUsers;
          setTyping(cur.filter((id) => id !== data.guestId));
        }, 4000);
      } else {
        if (typingTimerRef.current[data.guestId]) {
          clearTimeout(typingTimerRef.current[data.guestId]);
          delete typingTimerRef.current[data.guestId];
        }
        setTyping(current.filter((id) => id !== data.guestId));
      }
    });

    socket.on(SOCKET_EVENTS.ERROR, (data: { code: string; message: string }) => {
      console.error('[useSocket] error:', data.code, data.message);
      if (data.code === 'RATE_LIMITED') {
        // toast
      }
    });

    heartbeatRef.current = setInterval(() => {
      if (socket?.connected) socket.emit(SOCKET_EVENTS.PRESENCE_HEARTBEAT);
    }, 20000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (socket) {
        socket.disconnect();
        socket = null;
        if (typeof window !== 'undefined') (window as any).__socket = null;
      }
    };
  }, [session?.roomToken, session?.guestId]);

  const emit = useCallback((event: string, data?: any) => {
    if (socket?.connected) socket.emit(event, data);
  }, []);

  return { socket, emit };
}

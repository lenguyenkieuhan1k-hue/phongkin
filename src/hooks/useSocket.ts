'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRoomStore, useMessageStore, usePresenceStore } from './useStore';
import { SOCKET_EVENTS } from '@/socket/events';

let socket: Socket | null = null;

interface SessionData {
  token: string;
  darkId?: string;
}

export function useSocket(session: SessionData | null) {
  const reconnectAttempts = useRef(0);
  const recoveredRef = useRef(false);

  useEffect(() => {
    if (!session?.token) {
      if (socket) {
        socket.disconnect();
        socket = null;
        if (typeof window !== 'undefined') {
          (window as any).__socket = null;
        }
      }
      recoveredRef.current = false;
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';

    if (!socket) {
      socket = io(wsUrl, {
        auth: { token: session.token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      if (typeof window !== 'undefined') {
        (window as any).__socket = socket;
      }
    }

    const tryRecoverRoom = () => {
      if (recoveredRef.current) {
        // Already recovered this session; on reconnect just rejoin current room
        const currentRoomId = useRoomStore.getState().currentRoomId;
        if (currentRoomId && socket?.connected) {
          console.log('[useSocket] rejoin current room after reconnect:', currentRoomId);
          socket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId: currentRoomId });
        }
        return;
      }
      recoveredRef.current = true;

      // Fetch active rooms and auto-join the most recent one
      fetch('/api/rooms/active', {
        headers: { Authorization: `Bearer ${session.token}` },
      })
        .then((r) => r.ok ? r.json() : { rooms: [] })
        .then((data: { rooms: Array<{ roomId: string; status: string }> }) => {
          const active = data.rooms.find(
            (r) => r.status === 'ACTIVE' || r.status === 'PENDING'
          );
          if (active && socket?.connected) {
            console.log('[useSocket] recovering room:', active.roomId, 'status:', active.status);
            socket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId: active.roomId });
          }
        })
        .catch((err) => console.warn('[useSocket] room recovery failed:', err));
    };

    socket.on('connect', () => {
      console.log('Socket connected');
      reconnectAttempts.current = 0;
      tryRecoverRoom();
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      reconnectAttempts.current += 1;

      // If auth failed, clear stale localStorage and reload to recover
      if (error.message?.includes('Session') || error.message?.includes('Authentication')) {
        console.warn('[useSocket] Auth failed - clearing stale session');
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem('darktalk_session');
          } catch {}
        }
        // Hard reload to recreate session
        if (reconnectAttempts.current >= 2) {
          window.location.reload();
        }
      }
    });

    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, (data: { darkId: string; status: string }) => {
      const { setOnline, setOffline } = usePresenceStore.getState();
      if (data.status === 'online') {
        setOnline(data.darkId);
      } else {
        setOffline(data.darkId);
      }
    });

    socket.on(SOCKET_EVENTS.ROOM_JOINED, (data: { roomId: string; messages: any[]; room: any; expiresAt?: string }) => {
      const darkId = session.darkId;
      const { setCurrentRoom, addRoom } = useRoomStore.getState();
      const { setMessages } = useMessageStore.getState();

      setCurrentRoom(data.roomId);
      setMessages(data.roomId, data.messages);
      addRoom(data.roomId, {
        id: data.roomId,
        status: data.room.status,
        otherUserDarkId: data.room.darkIdA === darkId ? data.room.darkIdB : data.room.darkIdA,
      });

      // Update local session with fresh expiresAt (server extended TTL on join)
      if (data.expiresAt) {
        try {
          const saved = window.localStorage.getItem('darktalk_session');
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.expiresAt = data.expiresAt;
            window.localStorage.setItem('darktalk_session', JSON.stringify(parsed));
            console.log('[useSocket] session extended, new expiry:', data.expiresAt);
          }
        } catch {}
      }
    });

    socket.on(SOCKET_EVENTS.ROOM_LEFT, () => {
      useRoomStore.getState().setCurrentRoom(null);
    });

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, (message: any) => {
      useMessageStore.getState().addMessage(message.roomId, message);
    });

    socket.on(SOCKET_EVENTS.MESSAGE_RECALLED, (data: { messageId: string }) => {
      const { messages, updateMessage } = useMessageStore.getState();
      messages.forEach((roomMessages, roomId) => {
        const msg = roomMessages.find((m) => m.id === data.messageId);
        if (msg) {
          updateMessage(roomId, data.messageId, { recalledAt: new Date().toISOString() });
        }
      });
    });

    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, (data: { messageId: string }) => {
      const { messages, removeMessage } = useMessageStore.getState();
      messages.forEach((roomMessages, roomId) => {
        const msg = roomMessages.find((m) => m.id === data.messageId);
        if (msg) {
          removeMessage(roomId, data.messageId);
        }
      });
    });

    socket.on(SOCKET_EVENTS.TYPING_UPDATE, (data: { roomId: string; darkId: string; isTyping: boolean }) => {
      const { typingUsers, setTypingUsers } = useMessageStore.getState();
      const currentTyping = typingUsers.get(data.roomId) || [];
      const newTyping = data.isTyping
        ? [...new Set([...currentTyping, data.darkId])]
        : currentTyping.filter((d) => d !== data.darkId);
      setTypingUsers(data.roomId, newTyping);
    });

    socket.on(SOCKET_EVENTS.ERROR, (data: { code: string; message: string }) => {
      console.error('Socket error:', data.code, data.message);
    });

    socket.on('room:invite', (data: { roomId: string; fromDarkId: string; status: string }) => {
      console.log('Received room invite:', data);
    });

    socket.on('room:invite-accepted', (data: { roomId: string; acceptedByDarkId: string }) => {
      console.log('[Socket] invite accepted by', data.acceptedByDarkId, 'joining room', data.roomId);
      // Auto-join the room for the inviter
      if (socket) socket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId: data.roomId });
    });

    const heartbeatInterval = setInterval(() => {
      if (socket?.connected) {
        socket.emit(SOCKET_EVENTS.PRESENCE_HEARTBEAT);
      }
    }, 20000);

    // Refresh session TTL every 30 minutes while user is in a room.
    // This extends the 2h countdown as long as both parties keep chatting.
    const refreshInterval = setInterval(async () => {
      const currentRoomId = useRoomStore.getState().currentRoomId;
      if (!currentRoomId) return; // not in a room yet - don't extend
      try {
        const res = await fetch('/api/session/refresh', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const newExpiry = data.session?.expiresAt;
          if (newExpiry) {
            const saved = window.localStorage.getItem('darktalk_session');
            if (saved) {
              const parsed = JSON.parse(saved);
              parsed.expiresAt = newExpiry;
              window.localStorage.setItem('darktalk_session', JSON.stringify(parsed));
              console.log('[useSocket] session auto-extended to', newExpiry);
            }
          }
        }
      } catch (err) {
        console.warn('[useSocket] auto-refresh failed:', err);
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(refreshInterval);
      if (socket) {
        socket.disconnect();
        socket = null;
        if (typeof window !== 'undefined') {
          (window as any).__socket = null;
        }
      }
    };
  }, [session?.token, session?.darkId]);

  const emit = useCallback((event: string, data?: any) => {
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    emit(SOCKET_EVENTS.ROOM_JOIN, { roomId });
  }, [emit]);

  const leaveRoom = useCallback((roomId: string) => {
    emit(SOCKET_EVENTS.ROOM_LEAVE, { roomId });
  }, [emit]);

  const sendMessage = useCallback((data: { roomId: string; type: string; body?: string; attachmentId?: string }) => {
    emit(SOCKET_EVENTS.MESSAGE_SEND, data);
  }, [emit]);

  const recallMessage = useCallback((messageId: string) => {
    emit(SOCKET_EVENTS.MESSAGE_RECALL, { messageId });
  }, [emit]);

  const deleteMessage = useCallback((messageId: string) => {
    emit(SOCKET_EVENTS.MESSAGE_DELETE, { messageId });
  }, [emit]);

  const startTyping = useCallback((roomId: string) => {
    emit(SOCKET_EVENTS.TYPING_START, { roomId });
  }, [emit]);

  const stopTyping = useCallback((roomId: string) => {
    emit(SOCKET_EVENTS.TYPING_STOP, { roomId });
  }, [emit]);

  return {
    socket,
    emit,
    joinRoom,
    leaveRoom,
    sendMessage,
    recallMessage,
    deleteMessage,
    startTyping,
    stopTyping,
  };
}

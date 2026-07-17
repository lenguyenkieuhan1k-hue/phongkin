import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { SOCKET_EVENTS } from '../events';
import { getRecentMessagesService } from '@/services/message.service';
import {
  getRoomByIdService,
  getRoomMemberListService,
  getRoomMembersService,
  leaveRoomService,
} from '@/services/room.service';
import { reportMessages } from '@/lib/report-messages';
import { REPORT_ROOM_ID } from '../report-room';

// In-memory: socketId -> guestId (cho việc broadcast presence chính xác)
const roomSockets = new Map<string, Map<string, string>>(); // roomId -> { socketId: guestId }

function getRoomSocketMap(roomId: string): Map<string, string> {
  if (!roomSockets.has(roomId)) {
    roomSockets.set(roomId, new Map());
  }
  return roomSockets.get(roomId)!;
}

export function handleChatEvents(io: SocketIOServer, socket: AuthenticatedSocket): void {
  // Join room: được gọi tự động sau khi auth pass
  socket.on(SOCKET_EVENTS.ROOM_JOIN, async () => {
    try {
      if (!socket.roomId || !socket.guestId) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'NOT_AUTHED',
          message: 'Not authenticated.',
        });
      }

      // Special handling for Report Room
      if (socket.roomId === REPORT_ROOM_ID) {
        await socket.join(REPORT_ROOM_ID);

        const sockets = getRoomSocketMap(REPORT_ROOM_ID);
        sockets.set(socket.id, socket.guestId);

        // Get handle from socket (set during auth)
        const handle = socket.handle || 'Unknown';

        // Return messages from in-memory store
        socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
          roomId: REPORT_ROOM_ID,
          inviteToken: REPORT_ROOM_ID,
          messages: reportMessages.map((m) => ({
            id: m.id,
            roomId: m.roomId,
            senderGuestId: m.senderGuestId,
            senderHandle: m.senderHandle,
            type: m.type,
            body: m.body,
            attachments: m.attachments,
            createdAt: m.createdAt,
            recalledAt: null,
          })),
          room: {
            id: REPORT_ROOM_ID,
            duration: 0,
            maxMembers: 999,
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          },
          memberCount: sockets.size,
          members: Array.from(sockets.values()).map((gid) => ({
            guestId: gid,
            handle: 'User', // Simplified - no per-user handle in memory
            isOwner: false,
          })),
          myGuestId: socket.guestId,
        });

        // Notify others
        socket.to(REPORT_ROOM_ID).emit(SOCKET_EVENTS.ROOM_MEMBER_JOINED, {
          guestId: socket.guestId,
          handle,
          memberCount: sockets.size,
        });

        return;
      }

      const room = await getRoomByIdService(socket.roomId);
      if (!room) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'ROOM_NOT_FOUND',
          message: 'Phòng không tồn tại.',
        });
      }

      if (room.expiresAt.getTime() <= Date.now() || room.status === 'EXPIRED') {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'ROOM_EXPIRED',
          message: 'Phòng đã hết hạn.',
        });
        // mark to leave socket
      }

      await socket.join(room.id);

      // Track socket trong room
      const sockets = getRoomSocketMap(room.id);
      sockets.set(socket.id, socket.guestId);

      // Get messages + members
      const messages = await getRecentMessagesService(room.id);
      const memberCount = await getRoomMembersService(room.id);
      const members = await getRoomMemberListService(room.id);

      // Gửi cho người join
      socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
        roomId: room.id,
        inviteToken: room.inviteToken,
        messages: messages.map((m) => ({
          id: m.id,
          roomId: m.roomId,
          senderGuestId: m.senderGuestId,
          senderHandle: m.senderHandle,
          type: m.type,
          body: m.body,
          attachments: m.attachments,
          createdAt: m.createdAt.toISOString(),
          recalledAt: m.recalledAt?.toISOString() ?? null,
        })),
        room: {
          id: room.id,
          duration: room.duration,
          maxMembers: room.maxMembers,
          status: room.status,
          expiresAt: room.expiresAt.toISOString(),
        },
        memberCount,
        members,
        myGuestId: socket.guestId,
      });

      // Báo cho người khác
      socket.to(room.id).emit(SOCKET_EVENTS.ROOM_MEMBER_JOINED, {
        guestId: socket.guestId,
        memberCount: sockets.size,
      });
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: 'JOIN_ERROR',
        message: 'Không thể vào phòng.',
      });
    }
  });

  socket.on(SOCKET_EVENTS.ROOM_LEAVE, async () => {
    try {
      if (!socket.roomId || !socket.guestId) return;
      await socket.leave(socket.roomId);
      const sockets = getRoomSocketMap(socket.roomId);
      sockets.delete(socket.id);

      await leaveRoomService(socket.roomId, socket.guestId);
      socket.emit(SOCKET_EVENTS.ROOM_LEFT, { roomId: socket.roomId });
      socket.to(socket.roomId).emit(SOCKET_EVENTS.ROOM_MEMBER_LEFT, {
        guestId: socket.guestId,
        memberCount: sockets.size,
      });
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });

  // Cleanup khi socket disconnect (đóng tab, mất mạng, refresh) — không phụ thuộc
  // client có gọi ROOM_LEAVE hay không. Tránh leak roomSockets/typingUsers và sai memberCount.
  socket.on('disconnect', () => {
    try {
      if (!socket.roomId || !socket.guestId) return;
      const sockets = getRoomSocketMap(socket.roomId);
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);

        socket.to(socket.roomId).emit(SOCKET_EVENTS.ROOM_MEMBER_LEFT, {
          guestId: socket.guestId,
          memberCount: sockets.size,
        });
      }
    } catch (err) {
      console.error('Error on chat disconnect cleanup:', err);
    }
  });
}

export function emitRoomClosed(roomId: string, io: SocketIOServer): void {
  io.to(roomId).emit(SOCKET_EVENTS.ROOM_CLOSED, { roomId, reason: 'expired' });
  const sockets = roomSockets.get(roomId);
  if (sockets) {
    for (const socketId of sockets.keys()) {
      const s = io.sockets.sockets.get(socketId);
      s?.leave(roomId);
    }
    roomSockets.delete(roomId);
  }
}

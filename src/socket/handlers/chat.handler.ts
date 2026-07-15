import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { SOCKET_EVENTS } from '../events';
import { getRoom } from '@/lib/rooms';
import { getRecentMessagesService } from '@/services/message.service';
import { extendSession } from '@/lib/auth';

// In-memory room members
const roomMembers = new Map<string, Set<string>>();

export function handleChatEvents(io: SocketIOServer, socket: AuthenticatedSocket): void {
  // Join room
  socket.on(SOCKET_EVENTS.ROOM_JOIN, async (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      const room = getRoom(roomId);

      if (!room) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'ROOM_NOT_FOUND',
          message: 'Room not found.',
        });
      }

      if (room.status !== 'ACTIVE') {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'ROOM_NOT_ACTIVE',
          message: 'Room is not active.',
        });
      }

      // Extend session TTL: 2h starts counting from when user enters the room.
      // This way, if user spent an hour on the welcome screen, that hour doesn't count.
      let extendedExpiresAt: string | undefined;
      if (socket.sessionToken) {
        const extended = await extendSession(socket.sessionToken);
        if (extended) {
          extendedExpiresAt = extended.expiresAt.toISOString();
          console.log(`[chat] extended session ${socket.darkId} -> ${extendedExpiresAt}`);
        }
      }

      // Join Socket.IO room
      await socket.join(roomId);

      // Track member
      if (!roomMembers.has(roomId)) {
        roomMembers.set(roomId, new Set());
      }
      roomMembers.get(roomId)!.add(socket.darkId!);

      // Get recent messages
      const messages = await getRecentMessagesService(roomId);

      // Notify user
      socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
        roomId,
        messages: messages.map((m) => ({
          id: m.id,
          roomId: m.roomId,
          senderId: m.senderId,
          sender: { darkId: m.senderDarkId, handle: m.senderHandle },
          type: m.type,
          body: m.body,
          attachments: m.attachments,
          createdAt: m.createdAt.toISOString(),
          recalledAt: m.recalledAt?.toISOString() || null,
        })),
        room,
        expiresAt: extendedExpiresAt,
      });

      // Notify other user in room
      socket.to(roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
        darkId: socket.darkId,
        status: 'online',
        inRoom: true,
      });
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: 'JOIN_ERROR',
        message: 'Failed to join room.',
      });
    }
  });

  // Leave room
  socket.on(SOCKET_EVENTS.ROOM_LEAVE, async (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      await socket.leave(roomId);

      // Remove from members
      const members = roomMembers.get(roomId);
      if (members) {
        members.delete(socket.darkId!);
      }

      socket.emit(SOCKET_EVENTS.ROOM_LEFT, { roomId });

      // Notify other user
      socket.to(roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
        darkId: socket.darkId,
        status: 'offline',
        inRoom: false,
      });
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });
}

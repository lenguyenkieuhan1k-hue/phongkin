import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { SOCKET_EVENTS } from '../events';
import { sendMessageService, recallMessageService, deleteMessageService } from '@/services/message.service';
import { checkRateLimit } from '@/lib/rateLimit';
import { getAttachment } from '@/lib/storage-local';
import prisma from '@/lib/prisma';
import { reportMessages } from '@/lib/report-messages';
import { reportRoomHandles, REPORT_ROOM_ID } from '../report-room';
import { v4 as uuidv4 } from 'uuid';

const typingUsers = new Map<string, Map<string, string>>(); // roomId -> { socketId: guestId }

function getTypingMap(roomId: string): Map<string, string> {
  if (!typingUsers.has(roomId)) {
    typingUsers.set(roomId, new Map());
  }
  return typingUsers.get(roomId)!;
}

export function handleMessageEvents(io: SocketIOServer, socket: AuthenticatedSocket): void {
  socket.on(SOCKET_EVENTS.MESSAGE_SEND, async (data: {
    roomId?: string;
    type: string;
    body?: string;
    attachmentId?: string;
    attachmentMeta?: {
      storageKey: string;
      mimeType: string;
      byteSize: number;
      id: string;
    };
  }) => {
    try {
      if (!socket.guestId || !socket.roomId) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'NOT_AUTHED',
          message: 'Not authenticated.',
        });
      }

      const { type, body, attachmentId, attachmentMeta } = data;

      const { allowed } = await checkRateLimit(socket.guestId, 'message');
      if (!allowed) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'RATE_LIMITED',
          message: 'Bạn gửi tin nhắn quá nhanh. Vui lòng chậm lại.',
        });
      }

      // Special handling for Report Room (in-memory, no DB)
      if (socket.roomId === REPORT_ROOM_ID) {
        const handle = reportRoomHandles.get(socket.guestId) || 'Unknown';
        const messageId = uuidv4();
        const message = {
          id: messageId,
          roomId: REPORT_ROOM_ID,
          senderGuestId: socket.guestId,
          senderHandle: handle,
          type,
          body,
          attachments: attachmentMeta ? [{
            id: attachmentMeta.id,
            storageKey: attachmentMeta.storageKey,
            mimeType: attachmentMeta.mimeType,
            byteSize: attachmentMeta.byteSize,
          }] : undefined,
          createdAt: new Date().toISOString(),
        };
        reportMessages.push(message);

        io.to(REPORT_ROOM_ID).emit(SOCKET_EVENTS.MESSAGE_NEW, message);
        return;
      }

      // Chặn gửi nếu phòng đã expired giữa chừng (race với cron cleanup)
      const liveRoom = await prisma.room.findUnique({
        where: { id: socket.roomId },
        select: { status: true, expiresAt: true },
      });
      if (!liveRoom || liveRoom.status === 'EXPIRED' || liveRoom.expiresAt.getTime() <= Date.now()) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'ROOM_EXPIRED',
          message: 'Phòng đã hết hạn.',
        });
      }

      let attachments = undefined;
      if (attachmentMeta) {
        attachments = [{
          id: attachmentMeta.id,
          storageKey: attachmentMeta.storageKey,
          mimeType: attachmentMeta.mimeType,
          byteSize: attachmentMeta.byteSize,
          messageId: '',
        }];
      } else if (attachmentId) {
        const meta = getAttachment(attachmentId);
        if (meta) {
          attachments = [{
            id: meta.id,
            storageKey: meta.storageKey,
            mimeType: meta.mimeType,
            byteSize: meta.byteSize,
            messageId: '',
          }];
        }
      }

      const member = await prisma.roomMember.findFirst({
        where: { roomId: socket.roomId, guestId: socket.guestId, leftAt: null },
        select: { handle: true },
      });
      const handle = member?.handle;

      if (!handle) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'NOT_JOINED',
          message: 'Bạn chưa tham gia phòng.',
        });
      }

      const result = await sendMessageService({
        roomId: socket.roomId,
        senderGuestId: socket.guestId,
        senderHandle: handle,
        type: type as any,
        body,
        attachments,
      });

      if (!result.success) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'SEND_ERROR',
          message: result.error,
        });
      }

      const messageData = {
        id: result.message.id,
        roomId: result.message.roomId,
        senderGuestId: result.message.senderGuestId,
        senderHandle: result.message.senderHandle,
        type: result.message.type,
        body: result.message.body,
        attachments: result.message.attachments,
        createdAt: result.message.createdAt.toISOString(),
        recalledAt: null,
      };

      io.to(socket.roomId).emit(SOCKET_EVENTS.MESSAGE_NEW, messageData);

      // Stop typing
      const roomTyping = getTypingMap(socket.roomId);
      roomTyping.delete(socket.id);
      io.to(socket.roomId).emit(SOCKET_EVENTS.TYPING_UPDATE, {
        roomId: socket.roomId,
        guestId: socket.guestId,
        isTyping: false,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: 'SEND_ERROR',
        message: 'Không thể gửi tin nhắn.',
      });
    }
  });

  socket.on(SOCKET_EVENTS.MESSAGE_RECALL, async (data: { messageId: string }) => {
    try {
      if (!socket.guestId || !socket.roomId) return;

      // Special handling for Report Room
      if (socket.roomId === REPORT_ROOM_ID) {
        const idx = reportMessages.findIndex((m) => m.id === data.messageId && m.senderGuestId === socket.guestId);
        if (idx !== -1) {
          reportMessages[idx] = { ...reportMessages[idx], recalledAt: new Date().toISOString() } as any;
        }
        io.to(REPORT_ROOM_ID).emit(SOCKET_EVENTS.MESSAGE_RECALLED, { messageId: data.messageId });
        return;
      }

      const result = await recallMessageService(data.messageId, socket.guestId);
      if (!result.success) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'RECALL_ERROR',
          message: result.error,
        });
      }

      // io.to (không phải socket.to) để cả sender cũng nhận được event recall UI
      io.to(socket.roomId).emit(SOCKET_EVENTS.MESSAGE_RECALLED, { messageId: data.messageId });
    } catch (error) {
      console.error('Error recalling message:', error);
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: 'RECALL_ERROR',
        message: 'Không thể thu hồi tin nhắn.',
      });
    }
  });

  socket.on(SOCKET_EVENTS.MESSAGE_DELETE, async (data: { messageId: string }) => {
    try {
      if (!socket.guestId || !socket.roomId) return;

      // Special handling for Report Room
      if (socket.roomId === REPORT_ROOM_ID) {
        const idx = reportMessages.findIndex((m) => m.id === data.messageId && m.senderGuestId === socket.guestId);
        if (idx !== -1) {
          reportMessages.splice(idx, 1);
        }
        io.to(REPORT_ROOM_ID).emit(SOCKET_EVENTS.MESSAGE_DELETED, { messageId: data.messageId });
        return;
      }

      const result = await deleteMessageService(data.messageId, socket.guestId);
      if (!result.success) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'DELETE_ERROR',
          message: result.error,
        });
      }

      io.to(socket.roomId).emit(SOCKET_EVENTS.MESSAGE_DELETED, { messageId: data.messageId });
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: 'DELETE_ERROR',
        message: 'Không thể xóa tin nhắn.',
      });
    }
  });

  socket.on(SOCKET_EVENTS.TYPING_START, () => {
    if (!socket.guestId || !socket.roomId) return;
    const map = getTypingMap(socket.roomId);
    map.set(socket.id, socket.guestId);
    socket.to(socket.roomId).emit(SOCKET_EVENTS.TYPING_UPDATE, {
      roomId: socket.roomId,
      guestId: socket.guestId,
      isTyping: true,
    });
  });

  socket.on(SOCKET_EVENTS.TYPING_STOP, () => {
    if (!socket.guestId || !socket.roomId) return;
    const map = getTypingMap(socket.roomId);
    map.delete(socket.id);
    socket.to(socket.roomId).emit(SOCKET_EVENTS.TYPING_UPDATE, {
      roomId: socket.roomId,
      guestId: socket.guestId,
      isTyping: false,
    });
  });

  // Dọn typing state khi disconnect (race với user đóng tab giữa chừng)
  socket.on('disconnect', () => {
    if (!socket.roomId) return;
    const map = getTypingMap(socket.roomId);
    map.delete(socket.id);
  });
}

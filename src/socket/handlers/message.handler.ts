import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { SOCKET_EVENTS } from '../events';
import { sendMessageService, recallMessageService, deleteMessageService } from '@/services/message.service';
import { checkRateLimit } from '@/lib/rateLimit';
import { getAttachment } from '@/lib/storage-local';

// In-memory typing users
const typingUsers = new Map<string, Set<string>>();

export function handleMessageEvents(io: SocketIOServer, socket: AuthenticatedSocket): void {
  // Send message
  socket.on(SOCKET_EVENTS.MESSAGE_SEND, async (data: {
    roomId: string;
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
      const { roomId, type, body, attachmentId, attachmentMeta } = data;

      // Rate limit check
      const { allowed } = await checkRateLimit(socket.sessionId!, 'message');

      if (!allowed) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'RATE_LIMITED',
          message: 'Too many messages. Please slow down.',
        });
      }

      // Resolve attachment. Prefer attachmentMeta sent by client (skip DB),
      // otherwise look up by id in local storage map.
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

      // Send message
      const result = await sendMessageService({
        roomId,
        senderId: socket.sessionId!,
        senderDarkId: socket.darkId!,
        senderHandle: 'Anon',
        type: type as any,
        body,
        attachmentId,
        attachments,
      });

      if (!result.success) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'SEND_ERROR',
          message: result.error,
        });
      }

      // Emit to all in room including sender
      const messageData = {
        id: result.message.id,
        roomId: result.message.roomId,
        senderId: result.message.senderId,
        sender: {
          darkId: socket.darkId,
          handle: 'Anon',
        },
        type: result.message.type,
        body: result.message.body,
        attachments: result.message.attachments,
        createdAt: result.message.createdAt.toISOString(),
        recalledAt: null,
      };

      io.to(roomId).emit(SOCKET_EVENTS.MESSAGE_NEW, messageData);

      // Stop typing indicator
      const roomTyping = typingUsers.get(roomId);
      if (roomTyping) {
        roomTyping.delete(socket.darkId!);
      }
      io.to(roomId).emit(SOCKET_EVENTS.TYPING_UPDATE, {
        roomId,
        darkId: socket.darkId,
        isTyping: false,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: 'SEND_ERROR',
        message: 'Failed to send message.',
      });
    }
  });

  // Recall message
  socket.on(SOCKET_EVENTS.MESSAGE_RECALL, async (data: { messageId: string }) => {
    try {
      const { messageId } = data;

      const result = await recallMessageService(messageId, socket.sessionId!);

      if (!result.success) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'RECALL_ERROR',
          message: result.error,
        });
      }

      // Emit recall to all in room
      socket.rooms.forEach((roomId) => {
        if (roomId !== socket.id) {
          io.to(roomId).emit(SOCKET_EVENTS.MESSAGE_RECALLED, { messageId });
        }
      });
    } catch (error) {
      console.error('Error recalling message:', error);
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: 'RECALL_ERROR',
        message: 'Failed to recall message.',
      });
    }
  });

  // Delete message
  socket.on(SOCKET_EVENTS.MESSAGE_DELETE, async (data: { messageId: string }) => {
    try {
      const { messageId } = data;

      const result = await deleteMessageService(messageId, socket.sessionId!);

      if (!result.success) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'DELETE_ERROR',
          message: result.error,
        });
      }

      // Emit deletion to all in room
      socket.rooms.forEach((roomId) => {
        if (roomId !== socket.id) {
          io.to(roomId).emit(SOCKET_EVENTS.MESSAGE_DELETED, { messageId });
        }
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: 'DELETE_ERROR',
        message: 'Failed to delete message.',
      });
    }
  });

  // Typing start
  socket.on(SOCKET_EVENTS.TYPING_START, async (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      if (!typingUsers.has(roomId)) {
        typingUsers.set(roomId, new Set());
      }
      typingUsers.get(roomId)!.add(socket.darkId!);

      socket.to(roomId).emit(SOCKET_EVENTS.TYPING_UPDATE, {
        roomId,
        darkId: socket.darkId,
        isTyping: true,
      });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  });

  // Typing stop
  socket.on(SOCKET_EVENTS.TYPING_STOP, async (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      const roomTyping = typingUsers.get(roomId);
      if (roomTyping) {
        roomTyping.delete(socket.darkId!);
      }

      socket.to(roomId).emit(SOCKET_EVENTS.TYPING_UPDATE, {
        roomId,
        darkId: socket.darkId,
        isTyping: false,
      });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  });
}

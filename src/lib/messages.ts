import crypto from 'crypto';
import { prisma } from './prisma';

interface MessagesStore {
  messages: Map<string, Message[]>;
  messageById: Map<string, Message>;
}

declare global {
  // eslint-disable-next-line no-var
  var __phongkinMessages: MessagesStore | undefined;
}

function getStore(): MessagesStore {
  if (!globalThis.__phongkinMessages) {
    globalThis.__phongkinMessages = {
      messages: new Map<string, Message[]>(),
      messageById: new Map<string, Message>(),
    };
  }
  return globalThis.__phongkinMessages;
}

export interface Message {
  id: string;
  roomId: string;
  senderGuestId: string;
  senderHandle: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE' | 'SYSTEM';
  body?: string;
  attachments: Attachment[];
  createdAt: Date;
  recalledAt?: Date | null;
}

export interface Attachment {
  id: string;
  messageId: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  durationMs?: number;
  checksum: string;
}

export async function createMessage(data: {
  roomId: string;
  senderGuestId: string;
  senderHandle: string;
  type: Message['type'];
  body?: string;
  attachments?: Array<{
    id: string;
    storageKey: string;
    mimeType: string;
    byteSize: string | number;
    messageId?: string;
    width?: number;
    height?: number;
    durationMs?: number;
    checksum?: string;
  }>;
}): Promise<Message> {
  const id = crypto.randomUUID();
  const attachments: Attachment[] = (data.attachments || []).map((a) => ({
    id: a.id,
    messageId: id,
    storageKey: a.storageKey,
    mimeType: a.mimeType,
    byteSize: typeof a.byteSize === 'string' ? parseInt(a.byteSize, 10) || 0 : a.byteSize,
    width: a.width,
    height: a.height,
    durationMs: a.durationMs,
    checksum: a.checksum || '',
  }));

  const message: Message = {
    id,
    roomId: data.roomId,
    senderGuestId: data.senderGuestId,
    senderHandle: data.senderHandle,
    type: data.type,
    body: data.body,
    attachments,
    createdAt: new Date(),
    recalledAt: null,
  };

  // Lưu vào in-memory cache
  getStore().messageById.set(id, message);
  const store = getStore();
  if (!store.messages.has(data.roomId)) {
    store.messages.set(data.roomId, []);
  }
  store.messages.get(data.roomId)!.push(message);

  // Giới hạn 100 tin nhắn trong memory
  const roomMessages = store.messages.get(data.roomId)!;
  if (roomMessages.length > 100) {
    const removed = roomMessages.shift();
    if (removed) {
      getStore().messageById.delete(removed.id);
    }
  }

  // Persist xuống Prisma (async, không block)
  persistMessage(message).catch((e) => {
    console.error('[messages] Failed to persist:', e);
  });

  return message;
}

async function persistMessage(message: Message): Promise<void> {
  await prisma.message.create({
    data: {
      id: message.id,
      roomId: message.roomId,
      senderGuestId: message.senderGuestId,
      senderHandle: message.senderHandle,
      type: message.type,
      body: message.body,
      recalledAt: null,
      createdAt: message.createdAt,
      attachments: {
        create: message.attachments.map((a) => ({
          id: a.id,
          storageKey: a.storageKey,
          mimeType: a.mimeType,
          byteSize: a.byteSize,
          width: a.width,
          height: a.height,
          durationMs: a.durationMs,
          checksum: a.checksum,
        })),
      },
    },
  });
}

export function getMessages(roomId: string, limit: number = 100): Message[] {
  const roomMessages = getStore().messages.get(roomId) || [];
  return roomMessages.slice(-limit).reverse();
}

export function getMessage(messageId: string): Message | undefined {
  return getStore().messageById.get(messageId);
}

export async function recallMessage(messageId: string): Promise<boolean> {
  const message = getStore().messageById.get(messageId);
  if (!message) return false;
  message.recalledAt = new Date();
  getStore().messageById.set(messageId, message);

  // Persist recall xuống DB
  persistRecall(messageId, message.recalledAt).catch((e) => {
    console.error('[messages] Failed to persist recall:', e);
  });

  return true;
}

async function persistRecall(messageId: string, recalledAt: Date): Promise<void> {
  await prisma.message.update({
    where: { id: messageId },
    data: { recalledAt },
  });
}

export async function deleteMessage(messageId: string): Promise<boolean> {
  const message = getStore().messageById.get(messageId);
  if (!message) return false;

  getStore().messageById.delete(messageId);

  const roomMessages = getStore().messages.get(message.roomId);
  if (roomMessages) {
    const index = roomMessages.findIndex((m) => m.id === messageId);
    if (index !== -1) {
      roomMessages.splice(index, 1);
    }
  }

  // Persist delete xuống DB
  persistDelete(messageId).catch((e) => {
    console.error('[messages] Failed to persist delete:', e);
  });

  return true;
}

async function persistDelete(messageId: string): Promise<void> {
  await prisma.message.delete({ where: { id: messageId } });
}

export function addAttachment(messageId: string, attachment: Attachment): boolean {
  const message = getStore().messageById.get(messageId);
  if (!message) return false;
  message.attachments.push(attachment);
  getStore().messageById.set(messageId, message);
  return true;
}

export function deleteRoomMessages(roomId: string): number {
  const roomMessages = getStore().messages.get(roomId) || [];
  for (const m of roomMessages) {
    getStore().messageById.delete(m.id);
  }
  getStore().messages.delete(roomId);
  return roomMessages.length;
}

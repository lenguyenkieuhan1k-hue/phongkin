import crypto from 'crypto';

// In-memory message storage - use globalThis to survive HMR
interface MessagesStore {
  messages: Map<string, Message[]>;
  messageById: Map<string, Message>;
}

declare global {
  // eslint-disable-next-line no-var
  var __darktalkMessages: MessagesStore | undefined;
}

function getStore(): MessagesStore {
  if (!globalThis.__darktalkMessages) {
    globalThis.__darktalkMessages = {
      messages: new Map<string, Message[]>(),
      messageById: new Map<string, Message>(),
    };
  }
  return globalThis.__darktalkMessages;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderDarkId: string;
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

export function createMessage(data: {
  roomId: string;
  senderId: string;
  senderDarkId: string;
  senderHandle: string;
  type: Message['type'];
  body?: string;
  attachmentId?: string;
  attachments?: Array<{
    id: string;
    storageKey: string;
    mimeType: string;
    byteSize: string | number;
    messageId?: string;
  }>;
}): Message {
  const id = crypto.randomUUID();
  const message: Message = {
    id,
    roomId: data.roomId,
    senderId: data.senderId,
    senderDarkId: data.senderDarkId,
    senderHandle: data.senderHandle,
    type: data.type,
    body: data.body,
    attachments: (data.attachments || []).map((a) => ({
      id: a.id,
      messageId: id,
      storageKey: a.storageKey,
      mimeType: a.mimeType,
      byteSize: typeof a.byteSize === 'string' ? parseInt(a.byteSize, 10) || 0 : a.byteSize,
      checksum: '',
    })),
    createdAt: new Date(),
    recalledAt: null,
  };

  // Store by ID
  getStore().messageById.set(id, message);

  // Store in room list
  const store = getStore();
  if (!store.messages.has(data.roomId)) {
    store.messages.set(data.roomId, []);
  }
  store.messages.get(data.roomId)!.push(message);

  // Keep only last 100 messages per room
  const roomMessages = store.messages.get(data.roomId)!;
  if (roomMessages.length > 100) {
    const removed = roomMessages.shift();
    if (removed) {
      getStore().messageById.delete(removed.id);
    }
  }

  return message;
}

export function getMessages(roomId: string, limit: number = 100): Message[] {
  const roomMessages = getStore().messages.get(roomId) || [];
  return roomMessages.slice(-limit).reverse();
}

export function getMessage(messageId: string): Message | undefined {
  return getStore().messageById.get(messageId);
}

export function recallMessage(messageId: string): boolean {
  const message = getStore().messageById.get(messageId);
  if (!message) return false;
  message.recalledAt = new Date();
  getStore().messageById.set(messageId, message);
  return true;
}

export function deleteMessage(messageId: string): boolean {
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

  return true;
}

export function addAttachment(messageId: string, attachment: Attachment): boolean {
  const message = getStore().messageById.get(messageId);
  if (!message) return false;
  message.attachments.push(attachment);
  getStore().messageById.set(messageId, message);
  return true;
}

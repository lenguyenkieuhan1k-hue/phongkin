// Message storage - Prisma/Postgres implementation
// Drop-in replacement for src/lib/messages.ts
//
// OLD: in-memory globalThis Map (lost on restart)
// NEW: Postgres Message + Attachment tables (persistent, scales)
//
// The `senderDarkId` / `senderHandle` are denormalized into Message fields
// so we don't need a JOIN on every message render.

import prisma from './prisma';

export type MessageTypeValue = 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE' | 'SYSTEM';

export interface Attachment {
  id: string;
  messageId: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  checksum: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderDarkId: string;
  senderHandle: string;
  type: MessageTypeValue;
  body?: string | null;
  attachments: Attachment[];
  createdAt: Date;
  recalledAt?: Date | null;
}

/**
 * Shape returned to socket clients.
 */
export interface MessageDTO {
  id: string;
  roomId: string;
  senderId: string;
  sender: { darkId: string; handle: string };
  type: MessageTypeValue;
  body?: string | null;
  attachments: Attachment[];
  createdAt: string;
  recalledAt?: string | null;
}

/**
 * Convert DB message + sender to the DTO format the frontend expects.
 */
export function toMessageDTO(msg: Message): MessageDTO {
  return {
    id: msg.id,
    roomId: msg.roomId,
    senderId: msg.senderId,
    sender: { darkId: msg.senderDarkId, handle: msg.senderHandle },
    type: msg.type,
    body: msg.body,
    attachments: msg.attachments,
    createdAt: msg.createdAt.toISOString(),
    recalledAt: msg.recalledAt?.toISOString() ?? null,
  };
}

/**
 * Fetch a message + attachments + sender info.
 * Always includes denormalized senderDarkId/Handle for client convenience.
 */
async function hydrateMessage(msg: {
  id: string;
  roomId: string;
  senderId: string;
  type: MessageTypeValue;
  body: string | null;
  recalledAt: Date | null;
  createdAt: Date;
  sender: { darkId: string; handle: string };
  attachments: any[];
}): Promise<Message> {
  return {
    id: msg.id,
    roomId: msg.roomId,
    senderId: msg.senderId,
    senderDarkId: msg.sender.darkId,
    senderHandle: msg.sender.handle,
    type: msg.type,
    body: msg.body,
    recalledAt: msg.recalledAt,
    createdAt: msg.createdAt,
    attachments: msg.attachments.map((a) => ({
      id: a.id,
      messageId: a.messageId,
      storageKey: a.storageKey,
      mimeType: a.mimeType,
      byteSize: a.byteSize,
      width: a.width,
      height: a.height,
      durationMs: a.durationMs,
      checksum: a.checksum,
    })),
  };
}

export async function createMessage(data: {
  roomId: string;
  senderId: string;
  senderDarkId: string;
  senderHandle: string;
  type: MessageTypeValue;
  body?: string;
  attachments?: Array<{
    storageKey: string;
    mimeType: string;
    byteSize: number;
    checksum: string;
    width?: number;
    height?: number;
    durationMs?: number;
  }>;
}): Promise<Message> {
  // 1. Create the message
  const created = await prisma.message.create({
    data: {
      roomId: data.roomId,
      senderId: data.senderId,
      type: data.type,
      body: data.body,
      senderDarkId: data.senderDarkId,
      senderHandle: data.senderHandle,
    },
  });

  // 2. Create attachments (if any)
  if (data.attachments && data.attachments.length > 0) {
    await prisma.attachment.createMany({
      data: data.attachments.map((a) => ({
        messageId: created.id,
        storageKey: a.storageKey,
        mimeType: a.mimeType,
        byteSize: a.byteSize,
        checksum: a.checksum,
        width: a.width,
        height: a.height,
        durationMs: a.durationMs,
      })),
    });
  }

  return getMessage(created.id) as Promise<Message>;
}

export async function getMessages(
  roomId: string,
  limit: number = 50
): Promise<Message[]> {
  const messages = await prisma.message.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
    include: {
      attachments: true,
      sender: { select: { darkId: true, handle: true } },
    },
  });

  // Return oldest first (chat-style)
  const hydrated = await Promise.all(messages.reverse().map(hydrateMessage));
  return hydrated;
}

export async function getMessage(messageId: string): Promise<Message | null> {
  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      attachments: true,
      sender: { select: { darkId: true, handle: true } },
    },
  });

  if (!msg) return null;
  return hydrateMessage(msg);
}

/**
 * Recall: set recalledAt, body wiped to null, attachments preserved (for audit).
 * Frontend will hide the message based on recalledAt flag.
 */
export async function recallMessage(messageId: string): Promise<boolean> {
  try {
    await prisma.message.update({
      where: { id: messageId },
      data: { recalledAt: new Date(), body: null },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Hard delete message and its attachments (cascade).
 */
export async function deleteMessage(messageId: string): Promise<boolean> {
  try {
    await prisma.message.delete({ where: { id: messageId } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Cleanup: delete ALL messages older than 2h, including attachments.
 * Anti-forensic design: data only lives in DB for 2h.
 *
 * Schedule via cron: 0 * * * * (every hour)
 * Or on every new message as a one-shot cleanup.
 */
export async function purgeOldMessages(
  ttlMs: number = 2 * 60 * 60 * 1000
): Promise<{ messages: number; attachments: number }> {
  const cutoff = new Date(Date.now() - ttlMs);

  // Get message IDs before delete (to count attachments)
  const oldMessages = await prisma.message.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true },
  });

  if (oldMessages.length === 0) {
    return { messages: 0, attachments: 0 };
  }

  // Delete attachments first (cascade would work too but explicit is safer)
  const attResult = await prisma.attachment.deleteMany({
    where: { messageId: { in: oldMessages.map((m) => m.id) } },
  });

  const msgResult = await prisma.message.deleteMany({
    where: { id: { in: oldMessages.map((m) => m.id) } },
  });

  // Log the cleanup
  await prisma.cleanupLog.create({
    data: {
      entityType: 'MESSAGE',
      entityId: 'batch',
      reason: `purged ${msgResult.count} messages + ${attResult.count} attachments older than ${ttlMs}ms`,
    },
  });

  return { messages: msgResult.count, attachments: attResult.count };
}

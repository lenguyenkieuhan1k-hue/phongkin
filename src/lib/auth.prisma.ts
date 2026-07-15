// Session management - Prisma/Postgres implementation
// Drop-in replacement for src/lib/auth.ts
//
// OLD: file .sessions.json (in-process JSON file)
// NEW: Postgres Session table (survives restarts, scales horizontally)
//
// To activate: rename this file to `auth.ts` (and backup the old one)

import crypto from 'crypto';
import { nanoid } from 'nanoid';
import type { Session } from '@prisma/client';
import prisma from './prisma';

const DARK_ID_CHARS = '0123456789ABCDEFGHJKMNPQRSTUVWXYZ';
const DARK_ID_SEGMENT_LENGTH = 4;

export const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export function generateDarkId(): string {
  const segment = () =>
    Array.from({ length: DARK_ID_SEGMENT_LENGTH }, () =>
      DARK_ID_CHARS[Math.floor(Math.random() * DARK_ID_CHARS.length)]
    ).join('');

  return `DT-${segment()}-${segment()}`;
}

export function generateSessionToken(): string {
  return nanoid(32);
}

export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Create a new session, enforcing unique darkId (retry if collision).
 */
export async function createSession(ip: string): Promise<Session> {
  const ipHash = hashIp(ip);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateSessionToken();
    const darkId = generateDarkId();

    try {
      return await prisma.session.create({
        data: { token, darkId, handle: 'Anon', ipHash, expiresAt },
      });
    } catch (err: any) {
      // Unique constraint failed on darkId or token - retry with new values
      if (err?.code === 'P2002' && attempt < 4) {
        console.warn(`[auth] darkId/token collision (attempt ${attempt + 1}), retrying`);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to create session after 5 attempts');
}

/**
 * Look up active session by token. Auto-deletes expired.
 */
export async function getSessionByToken(token: string): Promise<Session | null> {
  const session = await prisma.session.findUnique({
    where: { token },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    // Best effort: delete expired session (don't fail the call)
    prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session;
}

/**
 * Look up active session by Dark ID.
 * Indexed by darkId in schema, so this is O(1).
 */
export async function getSessionByDarkId(darkId: string): Promise<Session | null> {
  const session = await prisma.session.findUnique({
    where: { darkId },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session;
}

export async function destroySession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

/**
 * Extend session by 2h. Idempotent.
 */
export async function extendSession(token: string): Promise<Session | null> {
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) return null;
  if (session.expiresAt < new Date()) return null;

  const newExpiresAt = new Date(Date.now() + SESSION_TTL_MS);

  return prisma.session.update({
    where: { token },
    data: { expiresAt: newExpiresAt },
  });
}

/**
 * Cleanup job: delete all expired sessions.
 * Schedule via cron: 0 * * * * (every hour)
 */
export async function purgeExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

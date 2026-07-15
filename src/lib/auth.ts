// Singleton storage for sessions - persists across module hot reloads
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import type { Session } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE_FILE = path.join(process.cwd(), '.sessions.json');

interface SessionStorage {
  sessions: Record<string, Session>;
  darkIdMap: Record<string, string>;
}

declare global {
  var __sessionCache: SessionStorage | undefined;
  var __sessionCacheMtime: number | undefined;
}

function emptyStorage(): SessionStorage {
  return { sessions: {}, darkIdMap: {} };
}

function getStorage(): SessionStorage {
  if (!globalThis.__sessionCache) {
    globalThis.__sessionCache = emptyStorage();
  }

  // Always check if file changed on disk and reload if needed
  let currentMtime = 0;
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      currentMtime = fs.statSync(STORAGE_FILE).mtimeMs;
    }
  } catch {}

  // Reload if file changed or first load
  if (globalThis.__sessionCacheMtime !== currentMtime) {
    const fresh = emptyStorage();
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
        const parsed = JSON.parse(data) as SessionStorage;
        const now = new Date();
        Object.entries(parsed.sessions).forEach(([token, session]) => {
          if (new Date(session.expiresAt) > now) {
            fresh.sessions[token] = session;
            fresh.darkIdMap[session.darkId] = token;
          }
        });
      }
    } catch (err) {
      console.error('Failed to load sessions from file:', err);
    }
    globalThis.__sessionCache = fresh;
    globalThis.__sessionCacheMtime = currentMtime;
  }

  return globalThis.__sessionCache;
}

function saveStorage(): void {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(getStorage(), null, 2));
    // Update mtime to skip next reload
    if (fs.existsSync(STORAGE_FILE)) {
      globalThis.__sessionCacheMtime = fs.statSync(STORAGE_FILE).mtimeMs;
    }
  } catch (err) {
    console.error('Failed to save sessions to file:', err);
  }
}

const DARK_ID_CHARS = '0123456789ABCDEFGHJKMNPQRSTUVWXYZ';
const DARK_ID_SEGMENT_LENGTH = 4;

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

export async function createSession(ip: string): Promise<Session> {
  const storage = getStorage();
  const token = generateSessionToken();
  const darkId = generateDarkId();
  const ipHash = hashIp(ip);
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  const session: Session = {
    id: crypto.randomUUID(),
    token,
    darkId,
    handle: 'Anon',
    ipHash,
    expiresAt,
    createdAt: new Date(),
  };

  storage.sessions[token] = session;
  storage.darkIdMap[darkId] = token;
  saveStorage();

  return session;
}

export async function getSessionByToken(token: string): Promise<Session | null> {
  const storage = getStorage();
  const session = storage.sessions[token];

  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    delete storage.sessions[token];
    delete storage.darkIdMap[session.darkId];
    saveStorage();
    return null;
  }

  return session;
}

export async function getSessionByDarkId(darkId: string): Promise<Session | null> {
  const storage = getStorage();
  const token = storage.darkIdMap[darkId];
  if (!token) return null;
  return getSessionByToken(token);
}

export async function destroySession(token: string): Promise<void> {
  const storage = getStorage();
  const session = storage.sessions[token];
  if (session) {
    delete storage.sessions[token];
    delete storage.darkIdMap[session.darkId];
    saveStorage();
  }
}

export async function extendSession(token: string): Promise<Session | null> {
  const session = await getSessionByToken(token);
  if (!session) return null;

  const storage = getStorage();
  const newExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  const updated: Session = {
    ...session,
    expiresAt: newExpiresAt,
  };

  storage.sessions[token] = updated;
  saveStorage();
  return updated;
}
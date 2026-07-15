import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import type { Server as HTTPServerType } from 'http';

// IMPORTANT: Keep this declaration outside any HMR-incompatible scope.
// We use globalThis to survive HMR/module re-evaluation.
declare global {
  // eslint-disable-next-line no-var
  var __darktalkIo: SocketIOServer | null | undefined;
  // eslint-disable-next-line no-var
  var __darktalkDarkIdToSocket: Map<string, string> | undefined;
}

function getSharedIo(): SocketIOServer | null {
  return globalThis.__darktalkIo ?? null;
}

function setSharedIo(io: SocketIOServer | null): void {
  globalThis.__darktalkIo = io;
}

function getSharedDarkIdMap(): Map<string, string> {
  if (!globalThis.__darktalkDarkIdToSocket) {
    globalThis.__darktalkDarkIdToSocket = new Map<string, string>();
  }
  return globalThis.__darktalkDarkIdToSocket;
}

export function getIO(): SocketIOServer | null {
  return getSharedIo();
}

export function getDarkIdToSocket(): Map<string, string> {
  return getSharedDarkIdMap();
}

export function trackDarkId(darkId: string, socketId: string): void {
  getSharedDarkIdMap().set(darkId, socketId);
}

export function untrackDarkId(darkId: string): void {
  getSharedDarkIdMap().delete(darkId);
}

export function emitToUser(darkId: string, event: string, data: any): boolean {
  const io = getSharedIo();
  const map = getSharedDarkIdMap();
  const socketId = map.get(darkId);
  if (!io) {
    console.warn('[socket] emitToUser: io not initialized');
    return false;
  }
  if (!socketId) {
    console.warn('[socket] emitToUser: no socket for darkId', darkId);
    return false;
  }
  io.to(socketId).emit(event, data);
  console.log(`[socket] emitted ${event} to ${darkId} (${socketId})`);
  return true;
}

export async function initSocketIO(httpServer: HTTPServer | HTTPServerType): Promise<SocketIOServer> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  let adapter: any = undefined;

  // Try to connect to Redis for scaling
  try {
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    adapter = createAdapter(pubClient, subClient);
    console.log('Socket.IO Redis adapter connected');
  } catch (err) {
    console.warn('Redis adapter not available, running without scaling:', err);
  }

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? ['https://darktalk.app']
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  if (adapter) {
    io.adapter(adapter);
  }

  setSharedIo(io);

  // Import and apply handlers
  const { setupSocketHandlers } = await import('./handlers');
  setupSocketHandlers(io);

  console.log('Socket.IO initialized');

  return io;
}

export interface AuthenticatedSocket extends Socket {
  sessionToken?: string;
  darkId?: string;
  sessionId?: string;
}

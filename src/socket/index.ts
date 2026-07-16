import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import type { Server as HTTPServerType } from 'http';

declare global {
  // eslint-disable-next-line no-var
  var __phongkinIo: SocketIOServer | null | undefined;
}

function getSharedIo(): SocketIOServer | null {
  return globalThis.__phongkinIo ?? null;
}

function setSharedIo(io: SocketIOServer | null): void {
  globalThis.__phongkinIo = io;
}

export function getIO(): SocketIOServer | null {
  return getSharedIo();
}

export async function initSocketIO(httpServer: HTTPServer | HTTPServerType): Promise<SocketIOServer> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  let adapter: any = undefined;

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
        ? ['https://phongkin.pro', /^https:\/\/.*\.onrender\.com$/, /^https:\/\/.*\.vercel\.app$/]
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['polling', 'websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true,
  });

  if (adapter) {
    io.adapter(adapter);
  }

  setSharedIo(io);

  const { setupSocketHandlers } = await import('./handlers');
  setupSocketHandlers(io);

  console.log('Socket.IO initialized');

  return io;
}

export interface AuthenticatedSocket extends Socket {
  roomId?: string;
  guestId?: string;
  inviteToken?: string;
  isOwner?: boolean;
}

import { Socket } from 'socket.io';
import { getSessionByToken } from '@/lib/auth';
import { AuthenticatedSocket } from './index';

export async function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  const token = socket.handshake.auth.token as string ||
    socket.handshake.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const session = await getSessionByToken(token);

    if (!session) {
      return next(new Error('Session expired or invalid'));
    }

    if (new Date(session.expiresAt) < new Date()) {
      return next(new Error('Session expired'));
    }

    (socket as AuthenticatedSocket).sessionToken = token;
    (socket as AuthenticatedSocket).darkId = session.darkId;
    (socket as AuthenticatedSocket).sessionId = session.id;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next(new Error('Authentication failed'));
  }
}

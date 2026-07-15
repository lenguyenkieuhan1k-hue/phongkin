import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { authMiddleware } from '../auth.middleware';
import { handleChatEvents } from './chat.handler';
import { handleMessageEvents } from './message.handler';
import { handlePresenceEvents } from './presence.handler';
import { handleInviteEvents } from './invite.handler';

export function setupSocketHandlers(io: SocketIOServer): void {
  // Auth middleware
  io.use(authMiddleware);

  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.darkId} (${socket.id})`);

    // Setup event handlers
    handleChatEvents(io, socket);
    handleMessageEvents(io, socket);
    handlePresenceEvents(io, socket);
    handleInviteEvents(io, socket);

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.darkId} (${socket.id})`);
    });
  });
}

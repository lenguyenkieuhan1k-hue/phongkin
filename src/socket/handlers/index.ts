import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { authMiddleware } from '../auth.middleware';
import { handleChatEvents } from './chat.handler';
import { handleMessageEvents } from './message.handler';
import { handlePresenceEvents } from './presence.handler';
import { handleVoiceCallEvents } from './voice-call.handler';

export function setupSocketHandlers(io: SocketIOServer): void {
  io.use(authMiddleware);

  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(
      `[socket] connected: roomId=${socket.roomId} guestId=${socket.guestId?.slice(0, 6)}... (${socket.id})`
    );

    handleChatEvents(io, socket);
    handleMessageEvents(io, socket);
    handlePresenceEvents(io, socket);
    handleVoiceCallEvents(io, socket);

    socket.on('disconnect', () => {
      console.log(
        `[socket] disconnected: roomId=${socket.roomId} guestId=${socket.guestId?.slice(0, 6)}...`
      );
    });
  });
}

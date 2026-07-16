import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { SOCKET_EVENTS } from '../events';

// Presence: chỉ heartbeat + báo offline. Member-count cleanup đã làm ở chat.handler
// để tránh double-emit. Ở đây chỉ broadcast trạng thái online/offline.
export function handlePresenceEvents(io: SocketIOServer, socket: AuthenticatedSocket): void {
  socket.on(SOCKET_EVENTS.PRESENCE_HEARTBEAT, () => {
    if (!socket.guestId || !socket.roomId) return;
    socket.to(socket.roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
      guestId: socket.guestId,
      status: 'online',
    });
  });

  socket.on('disconnect', () => {
    if (!socket.guestId || !socket.roomId) return;
    socket.to(socket.roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
      guestId: socket.guestId,
      status: 'offline',
    });
  });
}

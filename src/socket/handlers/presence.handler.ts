import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { SOCKET_EVENTS } from '../events';

// In-memory presence tracking
const onlineUsers = new Map<string, string>();

export function handlePresenceEvents(io: SocketIOServer, socket: AuthenticatedSocket): void {
  // Set online
  onlineUsers.set(socket.darkId!, socket.id);

  // Heartbeat
  socket.on(SOCKET_EVENTS.PRESENCE_HEARTBEAT, async () => {
    try {
      onlineUsers.set(socket.darkId!, socket.id);

      // Broadcast heartbeat to room members
      socket.rooms.forEach((roomId) => {
        if (roomId !== socket.id) {
          socket.to(roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
            darkId: socket.darkId,
            status: 'online',
          });
        }
      });
    } catch (error) {
      console.error('Error processing heartbeat:', error);
    }
  });

  // Broadcast offline on disconnect
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.darkId!);

    // Notify rooms
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        io.to(roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
          darkId: socket.darkId,
          status: 'offline',
        });
      }
    });
  });
}

export function getOnlineStatus(darkId: string): boolean {
  return onlineUsers.has(darkId);
}

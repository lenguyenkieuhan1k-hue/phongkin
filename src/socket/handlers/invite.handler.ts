import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket, trackDarkId, untrackDarkId } from '../index';

export function handleInviteEvents(io: SocketIOServer, socket: AuthenticatedSocket): void {
  // Track darkId -> socket mapping in shared global state
  trackDarkId(socket.darkId!, socket.id);

  // Clean up on disconnect
  socket.on('disconnect', () => {
    untrackDarkId(socket.darkId!);
  });
}
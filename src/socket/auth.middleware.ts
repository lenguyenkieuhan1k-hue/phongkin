import { Socket } from 'socket.io';
import { AuthenticatedSocket } from './index';
import { bindOwnerIfPendingService, getRoomByInviteTokenService } from '@/services/room.service';

interface AuthPayload {
  roomToken: string;
  guestId: string;
}

/**
 * Phòng Kín auth:
 * - Client gửi { roomToken, guestId } qua handshake.auth
 * - Server verify phòng còn active + guestId hợp lệ
 * - Không cần session token
 *
 * Đồng thời bind ownerGuestId nếu phòng còn `pending_<paymentId>` — đảm bảo
 * người đầu tiên reconnect/mở link trở thành owner thật.
 */
export async function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  const payload = socket.handshake.auth as Partial<AuthPayload>;

  const roomToken = payload.roomToken;
  const guestId = payload.guestId;

  if (!roomToken || !guestId) {
    return next(new Error('Missing roomToken or guestId'));
  }

  try {
    const room = await getRoomByInviteTokenService(roomToken);
    if (!room) {
      return next(new Error('Room not found'));
    }

    if (room.status === 'EXPIRED' || room.expiresAt.getTime() <= Date.now()) {
      return next(new Error('Room expired'));
    }

    // Claim owner nếu còn pending. Hàm này idempotent — chỉ owner đầu tiên win.
    const bound = await bindOwnerIfPendingService(room.id, guestId);
    const finalRoom = bound?.room ?? room;
    const isOwner = bound?.isOwner ?? finalRoom.ownerGuestId === guestId;

    (socket as AuthenticatedSocket).roomId = finalRoom.id;
    (socket as AuthenticatedSocket).inviteToken = roomToken;
    (socket as AuthenticatedSocket).guestId = guestId;
    (socket as AuthenticatedSocket).isOwner = isOwner;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next(new Error('Authentication failed'));
  }
}

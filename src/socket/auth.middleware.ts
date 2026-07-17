import { Socket } from 'socket.io';
import { AuthenticatedSocket } from './index';
import { bindOwnerIfPendingService, getRoomByInviteTokenService } from '@/services/room.service';
import { reportRoomGuests } from './report-room';

interface AuthPayload {
  roomToken: string;
  guestId: string;
}

const REPORT_ROOM_TOKEN = 'REPORT_ROOM';

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
    // Special case: Report room - không cần DB verify
    if (roomToken === REPORT_ROOM_TOKEN) {
      if (!reportRoomGuests.has(guestId)) {
        return next(new Error('Invalid guestId for report room'));
      }
      (socket as AuthenticatedSocket).roomId = REPORT_ROOM_TOKEN;
      (socket as AuthenticatedSocket).inviteToken = REPORT_ROOM_TOKEN;
      (socket as AuthenticatedSocket).guestId = guestId;
      (socket as AuthenticatedSocket).isOwner = false;
      return next();
    }

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

// Export for use in API routes
export function addReportRoomGuest(guestId: string, handle: string): void {
  reportRoomGuests.set(guestId, { handle, joinedAt: new Date() });
}

export function removeReportRoomGuest(guestId: string): void {
  reportRoomGuests.delete(guestId);
}

export { reportRoomGuests, REPORT_ROOM_TOKEN };

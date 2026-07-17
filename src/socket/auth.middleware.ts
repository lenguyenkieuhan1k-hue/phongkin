import { Socket } from 'socket.io';
import { AuthenticatedSocket } from './index';
import { bindOwnerIfPendingService, getRoomByInviteTokenService } from '@/services/room.service';
import { createHmac } from 'crypto';

interface AuthPayload {
  roomToken: string;
  guestId: string;
}

const REPORT_ROOM_TOKEN = 'REPORT_ROOM';

// HMAC secret for report room tokens (use env var in production)
const REPORT_TOKEN_SECRET = process.env.REPORT_TOKEN_SECRET || 'phongkin-report-secret-2026';

/**
 * Create a signed token for report room access
 * Format: base64(JSON payload).base64(HMAC signature)
 */
export function createReportRoomToken(guestId: string, handle: string): string {
  const payload = {
    guestId,
    handle,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', REPORT_TOKEN_SECRET)
    .update(payloadBase64)
    .digest('base64url');
  
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode a report room token
 */
export function verifyReportRoomToken(token: string): { guestId: string; handle: string } | null {
  try {
    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) return null;
    
    // Verify signature
    const expectedSignature = createHmac('sha256', REPORT_TOKEN_SECRET)
      .update(payloadBase64)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      console.error('[Report Token] Invalid signature');
      return null;
    }
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString());
    
    // Check expiration
    if (payload.exp < Date.now()) {
      console.error('[Report Token] Token expired');
      return null;
    }
    
    return { guestId: payload.guestId, handle: payload.handle };
  } catch (error) {
    console.error('[Report Token] Verification failed:', error);
    return null;
  }
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
    // Special case: Report room - verify signed token
    if (roomToken === REPORT_ROOM_TOKEN) {
      const tokenData = verifyReportRoomToken(guestId);
      if (!tokenData) {
        return next(new Error('Invalid guestId for report room'));
      }
      (socket as AuthenticatedSocket).roomId = REPORT_ROOM_TOKEN;
      (socket as AuthenticatedSocket).inviteToken = REPORT_ROOM_TOKEN;
      (socket as AuthenticatedSocket).guestId = tokenData.guestId;
      (socket as AuthenticatedSocket).handle = tokenData.handle;
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

export { REPORT_ROOM_TOKEN };

/**
 * Room lifecycle background jobs.
 * - Mỗi 60s: quét phòng hết hạn → XÓA hoàn toàn Room + Members + Messages + Attachments
 * - Mỗi 5 phút: đánh dấu payment PENDING quá 10p → EXPIRED
 */

import { getIO } from '@/socket';
import { expireRoomService, getExpiredRoomsService } from './room.service';
import { expirePendingPaymentsService } from './payment.service';
import { deleteRoomMessages } from '@/lib/messages';

const ROOM_CHECK_INTERVAL_MS = 60 * 1000;       // 60s
const PAYMENT_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 min

async function runExpiredRoomsCheck(): Promise<void> {
  try {
    const expired = await getExpiredRoomsService();
    if (expired.length === 0) return;

    const io = getIO();
    for (const room of expired) {
      // Disconnect all sockets trong room (phải làm TRƯỚC khi xóa DB)
      if (io) {
        io.to(room.id).emit('room:closed', { roomId: room.id, reason: 'expired' });
        const sockets = await io.in(room.id).fetchSockets();
        for (const s of sockets) {
          s.leave(room.id);
          s.disconnect(true);
        }
      }

      // Xóa Room (cascade xóa luôn RoomMember, Message, Attachment)
      await expireRoomService(room.id);

      // Xóa messages in-memory
      deleteRoomMessages(room.id);

      console.log(`[lifecycle] expired + purged room ${room.id} (token=${room.inviteToken})`);
    }
  } catch (err) {
    console.error('[lifecycle] expireRooms error:', err);
  }
}

async function runPaymentExpireCheck(): Promise<void> {
  try {
    const n = await expirePendingPaymentsService();
    if (n > 0) console.log(`[lifecycle] expired ${n} pending payments`);
  } catch (err) {
    console.error('[lifecycle] expirePayments error:', err);
  }
}

let roomTimer: NodeJS.Timeout | null = null;
let paymentTimer: NodeJS.Timeout | null = null;

export function startRoomLifecycleLoop(): () => void {
  if (roomTimer) clearInterval(roomTimer);
  if (paymentTimer) clearInterval(paymentTimer);

  roomTimer = setInterval(runExpiredRoomsCheck, ROOM_CHECK_INTERVAL_MS);
  paymentTimer = setInterval(runPaymentExpireCheck, PAYMENT_CHECK_INTERVAL_MS);

  // Chạy ngay sau khi khởi động 10s (để server boot xong)
  setTimeout(runExpiredRoomsCheck, 10 * 1000);
  setTimeout(runPaymentExpireCheck, 15 * 1000);

  console.log('[lifecycle] cleanup loops started');

  return () => {
    if (roomTimer) clearInterval(roomTimer);
    if (paymentTimer) clearInterval(paymentTimer);
  };
}

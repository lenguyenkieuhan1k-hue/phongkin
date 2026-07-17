/**
 * Room service — Prisma layer.
 * Là single source of truth cho Room + RoomMember + Member capacity.
 *
 * API ngắn gọn:
 *  - createRoom()                  tạo phòng sau khi thanh toán thành công
 *  - getRoomByInviteToken()        resolve token → room info
 *  - getRoomById()                 lookup theo uuid
 *  - joinRoom()                    thêm member, check capacity
 *  - leaveRoom()                   gỡ member
 *  - getRoomMembers()              list member (để hiển thị online count)
 *  - expireRoomService()           XÓA hoàn toàn Room + cascade Members/Messages/Attachments
 *  - getExpiredRooms()             cron: lấy rooms đã hết hạn
 */

import prisma from '@/lib/prisma';
import { deleteObject } from '@/lib/storage';
import {
  cacheRoom,
  createRoom as createRoomCache,
  deleteRoom as deleteRoomCache,
  getRoom as getRoomCache,
  getRoomByInviteToken as getRoomByInviteTokenCache,
  setRoomStatus as setRoomStatusCache,
  type Room,
  type RoomStatus,
} from '@/lib/rooms';

export interface JoinRoomResult {
  success: boolean;
  room?: Room;
  members?: number;
  error?: string;
  code?: 'NOT_FOUND' | 'EXPIRED' | 'FULL' | 'ALREADY_JOINED';
}

export async function createRoomService(params: {
  ownerGuestId: string;
  duration: number;
  maxMembers: number;
  paymentId: string;
  inviteToken: string;
}): Promise<Room> {
  const room = await prisma.room.create({
    data: {
      inviteToken: params.inviteToken,
      ownerGuestId: params.ownerGuestId,
      duration: params.duration,
      maxMembers: params.maxMembers,
      paymentId: params.paymentId,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + params.duration * 60 * 1000),
    },
  });

  const cache: Room = {
    id: room.id,
    inviteToken: room.inviteToken,
    ownerGuestId: room.ownerGuestId,
    duration: room.duration,
    maxMembers: room.maxMembers,
    status: room.status as RoomStatus,
    paymentId: room.paymentId!,
    expiresAt: room.expiresAt,
    createdAt: room.createdAt,
  };
  cacheRoom(cache);

  return cache;
}

export async function getRoomByIdService(roomId: string): Promise<Room | null> {
  const cached = getRoomCache(roomId);
  if (cached) return cached;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return null;

  const result: Room = {
    id: room.id,
    inviteToken: room.inviteToken,
    ownerGuestId: room.ownerGuestId,
    duration: room.duration,
    maxMembers: room.maxMembers,
    status: room.status as RoomStatus,
    paymentId: room.paymentId ?? '',
    expiresAt: room.expiresAt,
    createdAt: room.createdAt,
  };
  cacheRoom(result);
  return result;
}

export async function bindOwnerIfPendingService(
  roomId: string,
  guestId: string
): Promise<{ room: Room; isOwner: boolean } | null> {
  // Chỉ rebind nếu owner hiện tại còn là `pending_<paymentId>` (chưa được ai claim).
  // Dùng updateMany + WHERE để không ghi đè nếu owner đã được bind bởi request khác.
  const updated = await prisma.room.updateMany({
    where: { id: roomId, ownerGuestId: { startsWith: 'pending_' } },
    data: { ownerGuestId: guestId },
  });

  // Lấy lại room (kể cả khi không updateMany hit → owner đã bind bởi người khác)
  const fresh = await prisma.room.findUnique({ where: { id: roomId } });
  if (!fresh) return null;

  // Sync cache in-memory
  const cached = getRoomCache(roomId);
  if (cached) {
    cached.ownerGuestId = fresh.ownerGuestId;
  }

  // Nếu member đã join trước đó với isOwner sai, sửa lại
  await prisma.roomMember.updateMany({
    where: { roomId, guestId, isOwner: false, leftAt: null },
    data: { isOwner: fresh.ownerGuestId === guestId },
  });

  const result: Room = {
    id: fresh.id,
    inviteToken: fresh.inviteToken,
    ownerGuestId: fresh.ownerGuestId,
    duration: fresh.duration,
    maxMembers: fresh.maxMembers,
    status: fresh.status as RoomStatus,
    paymentId: fresh.paymentId ?? '',
    expiresAt: fresh.expiresAt,
    createdAt: fresh.createdAt,
  };

  return { room: result, isOwner: fresh.ownerGuestId === guestId };
}

export async function getRoomByInviteTokenService(token: string): Promise<Room | null> {
  const cached = getRoomByInviteTokenCache(token);
  if (cached) return cached;

  const room = await prisma.room.findUnique({ where: { inviteToken: token } });
  if (!room) return null;

  const result: Room = {
    id: room.id,
    inviteToken: room.inviteToken,
    ownerGuestId: room.ownerGuestId,
    duration: room.duration,
    maxMembers: room.maxMembers,
    status: room.status as RoomStatus,
    paymentId: room.paymentId ?? '',
    expiresAt: room.expiresAt,
    createdAt: room.createdAt,
  };
  cacheRoom(result);
  return result;
}

export async function joinRoomService(
  roomToken: string,
  guestId: string,
  handle: string
): Promise<JoinRoomResult> {
  const room = await getRoomByInviteTokenService(roomToken);
  if (!room) return { success: false, error: 'Phòng không tồn tại.', code: 'NOT_FOUND' };

  if (room.expiresAt.getTime() <= Date.now() || room.status === 'EXPIRED') {
    return { success: false, error: 'Phòng đã hết hạn.', code: 'EXPIRED' };
  }

  const existingMembers = await prisma.roomMember.count({
    where: { roomId: room.id, leftAt: null },
  });

  const alreadyJoined = await prisma.roomMember.findFirst({
    where: { roomId: room.id, guestId, leftAt: null },
  });

  if (alreadyJoined) {
    return { success: true, room, members: existingMembers };
  }

  if (existingMembers >= room.maxMembers) {
    setRoomStatusCache(room.id, 'FULL');
    return { success: false, error: 'Phòng đã đủ số lượng thành viên.', code: 'FULL' };
  }

  await prisma.roomMember.create({
    data: { roomId: room.id, guestId, handle, isOwner: guestId === room.ownerGuestId },
  });

  const newCount = existingMembers + 1;
  if (newCount >= room.maxMembers) {
    setRoomStatusCache(room.id, 'FULL');
  }

  return { success: true, room, members: newCount };
}

export async function leaveRoomService(roomId: string, guestId: string): Promise<void> {
  await prisma.roomMember.updateMany({
    where: { roomId, guestId, leftAt: null },
    data: { leftAt: new Date() },
  });

  const activeCount = await prisma.roomMember.count({
    where: { roomId, leftAt: null },
  });

  const cached = getRoomCache(roomId);
  if (cached && cached.status === 'FULL' && activeCount < cached.maxMembers) {
    setRoomStatusCache(roomId, 'ACTIVE');
  }
}

export async function getRoomMembersService(roomId: string): Promise<number> {
  return prisma.roomMember.count({
    where: { roomId, leftAt: null },
  });
}

export async function getRoomMemberListService(roomId: string) {
  return prisma.roomMember.findMany({
    where: { roomId, leftAt: null },
    orderBy: { joinedAt: 'asc' },
    select: { guestId: true, handle: true, isOwner: true, joinedAt: true },
  });
}

export async function expireRoomService(roomId: string): Promise<void> {
  // Lấy danh sách attachment storageKeys TRƯỚC khi cascade xóa
  const attachments = await prisma.attachment.findMany({
    where: { message: { roomId } },
    select: { storageKey: true },
  });

  // Xóa file vật lý trên MinIO — bảo đảm quyền riêng tư
  await Promise.allSettled(
    attachments.map((a) => deleteObject(a.storageKey).catch(() => {}))
  );

  // Xóa Room → cascade xóa luôn RoomMember, Message, Attachment
  await prisma.room.delete({ where: { id: roomId } }).catch(() => {});

  // Xóa cache in-memory
  deleteRoomCache(roomId);
}

export async function getExpiredRoomsService(): Promise<Room[]> {
  const now = new Date();
  const rows = await prisma.room.findMany({
    where: {
      expiresAt: { lt: now },
      status: { not: 'EXPIRED' },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    inviteToken: r.inviteToken,
    ownerGuestId: r.ownerGuestId,
    duration: r.duration,
    maxMembers: r.maxMembers,
    status: r.status as RoomStatus,
    paymentId: r.paymentId ?? '',
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
  }));
}

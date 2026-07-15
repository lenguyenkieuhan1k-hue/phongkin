// Invite service - Prisma/Postgres implementation
// Drop-in replacement for src/services/invite.service.ts
//
// OLD: used in-memory lib/rooms.ts + file-based lib/auth.ts
// NEW: uses Prisma room.service.ts + Prisma auth.prisma.ts
//
// Invites are stored in Redis (with 30min TTL) to enable real-time delivery
// via Socket.IO when target user is online.

import {
  createRoomService,
  getRoomService,
  updateRoomStatusService,
  closeRoomService,
  getRoomsByDarkIdService,
} from './room.service';
import { getSessionByDarkId } from '@/lib/auth.prisma';
import { checkRateLimit } from '@/lib/rateLimit';
import { redis, REDIS_KEYS, INVITE_TTL } from '@/lib/redis';

export interface InviteResult {
  success: true;
  room: any;
}

export interface InviteError {
  success: false;
  error: string;
}

export interface PendingInvite {
  roomId: string;
  fromDarkId: string;
  inviterSessionId: string;
  createdAt: number;
}

/**
 * Send an invite from `inviterDarkId` to `targetDarkId`.
 */
export async function sendInviteService(
  inviterDarkId: string,
  targetDarkId: string,
  inviterSessionId: string
): Promise<InviteResult | InviteError> {
  const { allowed } = await checkRateLimit(inviterDarkId, 'invite');
  if (!allowed) {
    return {
      success: false,
      error: 'Too many invitations. Please try again later.',
    };
  }

  // Target must have an active session
  const targetSession = await getSessionByDarkId(targetDarkId);
  if (!targetSession) {
    return {
      success: false,
      error: 'Dark ID not found or session expired.',
    };
  }

  if (inviterDarkId === targetDarkId) {
    return {
      success: false,
      error: 'Cannot create a room with yourself.',
    };
  }

  // Create room via Prisma service
  const roomResult = await createRoomService({
    inviterDarkId,
    inviteeDarkId: targetDarkId,
  });

  if (!roomResult.success) {
    return { success: false, error: roomResult.error };
  }

  // Store invite metadata in Redis (with TTL)
  const invite: PendingInvite = {
    roomId: roomResult.room.id,
    fromDarkId: inviterDarkId,
    inviterSessionId,
    createdAt: Date.now(),
  };

  await redis.set(
    REDIS_KEYS.invite(targetDarkId),
    JSON.stringify(invite),
    'EX',
    INVITE_TTL
  );

  return { success: true, room: roomResult.room };
}

/**
 * Get pending invites for a user.
 */
export async function getPendingInvitesService(
  darkId: string
): Promise<PendingInvite[]> {
  const data = await redis.get(REDIS_KEYS.invite(darkId));
  if (!data) return [];

  try {
    const invite = JSON.parse(data) as PendingInvite;
    return [invite];
  } catch {
    return [];
  }
}

/**
 * Accept an invite: room becomes ACTIVE, invite removed from Redis.
 */
export async function acceptInviteService(
  inviteeDarkId: string,
  roomId: string
): Promise<{ success: true; room: any } | { success: false; error: string }> {
  const data = await redis.get(REDIS_KEYS.invite(inviteeDarkId));

  if (!data) {
    return { success: false, error: 'No pending invitation found.' };
  }

  const invite = JSON.parse(data) as PendingInvite;
  if (invite.roomId !== roomId) {
    return { success: false, error: 'Invalid invitation.' };
  }

  const room = await getRoomService(roomId);
  if (!room) {
    return { success: false, error: 'Room not found.' };
  }

  const updatedRoom = await updateRoomStatusService(roomId, 'ACTIVE');
  if (!updatedRoom) {
    return { success: false, error: 'Failed to update room.' };
  }

  // Clean up invite
  await redis.del(REDIS_KEYS.invite(inviteeDarkId));

  return { success: true, room: updatedRoom };
}

/**
 * Reject an invite.
 */
export async function rejectInviteService(
  darkId: string,
  roomId: string
): Promise<{ success: boolean; error?: string }> {
  const room = await updateRoomStatusService(roomId, 'REJECTED');
  if (!room) {
    return { success: false, error: 'Failed to reject invitation.' };
  }

  await redis.del(REDIS_KEYS.invite(darkId));
  return { success: true };
}

/**
 * Close a room (set EXPIRED status).
 */
export async function closeRoom(roomId: string): Promise<boolean> {
  const result = await closeRoomService(roomId);
  return result.success;
}

/**
 * Get active rooms for a user.
 */
export async function getRoomsByDarkId(darkId: string): Promise<any[]> {
  return getRoomsByDarkIdService(darkId);
}

export interface ActiveRoomInfo {
  roomId: string;
  otherUserDarkId: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'EXPIRED';
}

export async function getActiveRoomsForUserService(
  darkId: string
): Promise<ActiveRoomInfo[]> {
  const rooms = await getRoomsByDarkIdService(darkId);
  return rooms.map((r) => ({
    roomId: r.id,
    otherUserDarkId: r.darkIdA === darkId ? (r.darkIdB || '') : r.darkIdA,
    status: r.status,
  }));
}

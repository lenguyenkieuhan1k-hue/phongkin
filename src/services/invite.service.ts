import {
  createRoom,
  getRoom,
  updateRoomStatus,
  closeRoom,
  setInvite,
  getInvite,
  deleteInvite,
  getRoomsByDarkId,
  Room,
} from '@/lib/rooms';
import { getSessionByDarkId } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

export interface InviteResult {
  success: true;
  room: Room;
}

export interface InviteError {
  success: false;
  error: string;
}

export async function sendInviteService(
  inviterDarkId: string,
  targetDarkId: string,
  inviterSessionId: string
): Promise<InviteResult | InviteError> {
  // Rate limit check
  const { allowed } = await checkRateLimit(inviterDarkId, 'invite');

  if (!allowed) {
    return {
      success: false,
      error: 'Too many invitations. Please try again later.',
    };
  }

  // Check if target exists
  const targetSession = await getSessionByDarkId(targetDarkId);

  if (!targetSession) {
    return {
      success: false,
      error: 'Dark ID not found or session expired.',
    };
  }

  // Check if inviter is trying to invite themselves
  if (inviterDarkId === targetDarkId) {
    return {
      success: false,
      error: 'Cannot create a room with yourself.',
    };
  }

  // Create room
  const room = createRoom(inviterDarkId, targetDarkId);

  // Store invitation
  setInvite(targetDarkId, {
    roomId: room.id,
    fromDarkId: inviterDarkId,
    inviterSessionId,
    createdAt: Date.now(),
  });

  return { success: true, room };
}

export interface PendingInvite {
  roomId: string;
  fromDarkId: string;
  createdAt: number;
}

export async function getPendingInvitesService(
  darkId: string
): Promise<PendingInvite[]> {
  const invite = getInvite(darkId);

  if (!invite) {
    return [];
  }

  return [{
    roomId: invite.roomId,
    fromDarkId: invite.fromDarkId,
    createdAt: invite.createdAt,
  }];
}

export async function acceptInviteService(
  inviteeDarkId: string,
  roomId: string
): Promise<{ success: true; room: Room } | { success: false; error: string }> {
  // Verify the invite exists
  const invite = getInvite(inviteeDarkId);

  if (!invite) {
    return { success: false, error: 'No pending invitation found.' };
  }

  if (invite.roomId !== roomId) {
    return { success: false, error: 'Invalid invitation.' };
  }

  // Get room and update status
  const room = getRoom(roomId);

  if (!room) {
    return { success: false, error: 'Room not found.' };
  }

  const updatedRoom = updateRoomStatus(roomId, 'ACTIVE');

  if (!updatedRoom) {
    return { success: false, error: 'Failed to update room.' };
  }

  // Clean up invitation
  deleteInvite(inviteeDarkId);

  return { success: true, room: updatedRoom };
}

export async function rejectInviteService(
  darkId: string,
  roomId: string
): Promise<{ success: boolean; error?: string }> {
  const room = updateRoomStatus(roomId, 'REJECTED');

  if (!room) {
    return { success: false, error: 'Failed to reject invitation.' };
  }

  // Clean up invitation
  deleteInvite(darkId);

  return { success: true };
}

export { getRoom, closeRoom };

export interface ActiveRoomInfo {
  roomId: string;
  otherUserDarkId: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'EXPIRED';
}

export async function getActiveRoomsForUserService(darkId: string): Promise<ActiveRoomInfo[]> {
  const rooms = getRoomsByDarkId(darkId);
  return rooms.map((r) => ({
    roomId: r.id,
    otherUserDarkId: r.darkIdA === darkId ? (r.darkIdB || '') : r.darkIdA,
    status: r.status,
  }));
}

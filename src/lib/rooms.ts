import crypto from 'crypto';

// IMPORTANT: Use globalThis to survive Next.js HMR module re-evaluation.
// Without this, in-memory state is lost every time the API route is recompiled.

interface RoomsModule {
  rooms: Map<string, Room>;
  pendingInvites: Map<string, PendingInvite>;
}

declare global {
  // eslint-disable-next-line no-var
  var __darktalkRooms: RoomsModule | undefined;
}

function getStore(): RoomsModule {
  if (!globalThis.__darktalkRooms) {
    globalThis.__darktalkRooms = {
      rooms: new Map<string, Room>(),
      pendingInvites: new Map<string, PendingInvite>(),
    };
  }
  return globalThis.__darktalkRooms;
}

export interface Room {
  id: string;
  darkIdA: string;
  darkIdB: string | null;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'EXPIRED';
  createdAt: Date;
  expiresAt: Date;
}

export interface PendingInvite {
  roomId: string;
  fromDarkId: string;
  inviterSessionId: string;
  createdAt: number;
}

export function createRoom(inviterDarkId: string, inviteeDarkId: string): Room {
  const id = crypto.randomUUID();
  const room: Room = {
    id,
    darkIdA: inviterDarkId,
    darkIdB: inviteeDarkId,
    status: 'PENDING',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  };
  getStore().rooms.set(id, room);
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return getStore().rooms.get(roomId);
}

export function updateRoomStatus(roomId: string, status: Room['status']): Room | undefined {
  const room = getStore().rooms.get(roomId);
  if (!room) return undefined;
  room.status = status;
  getStore().rooms.set(roomId, room);
  return room;
}

export function closeRoom(roomId: string): boolean {
  return getStore().rooms.delete(roomId);
}

export function getRoomsByDarkId(darkId: string): Room[] {
  return Array.from(getStore().rooms.values()).filter(
    (r) => (r.darkIdA === darkId || r.darkIdB === darkId) &&
           (r.status === 'PENDING' || r.status === 'ACTIVE')
  );
}

export function setInvite(darkId: string, invite: PendingInvite): void {
  getStore().pendingInvites.set(darkId, invite);
}

export function getInvite(darkId: string): PendingInvite | undefined {
  return getStore().pendingInvites.get(darkId);
}

export function deleteInvite(darkId: string): void {
  getStore().pendingInvites.delete(darkId);
}

export function getAllPendingInvites(): Map<string, PendingInvite> {
  return getStore().pendingInvites;
}

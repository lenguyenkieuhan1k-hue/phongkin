/**
 * Room in-memory cache + business logic.
 * Persistent data ở Prisma (xem src/services/room.service.ts).
 *
 * NOTE: `joinMember`/`leaveMember` được thực hiện qua Prisma để persist,
 * nhưng cache này giữ metadata để tra cứu nhanh và check capacity.
 */

import crypto from 'crypto';

interface RoomsModule {
  rooms: Map<string, Room>;
  tokenIndex: Map<string, string>;
}

declare global {
  // eslint-disable-next-line no-var
  var __phongkinRooms: RoomsModule | undefined;
}

function getStore(): RoomsModule {
  if (!globalThis.__phongkinRooms) {
    globalThis.__phongkinRooms = {
      rooms: new Map<string, Room>(),
      tokenIndex: new Map<string, string>(),
    };
  }
  return globalThis.__phongkinRooms;
}

export type RoomStatus = 'ACTIVE' | 'FULL' | 'EXPIRED';

export interface Room {
  id: string;
  inviteToken: string;
  ownerGuestId: string;
  duration: number;
  maxMembers: number;
  status: RoomStatus;
  paymentId: string;
  expiresAt: Date;
  createdAt: Date;
}

export function cacheRoom(room: Room): void {
  const store = getStore();
  store.rooms.set(room.id, room);
  store.tokenIndex.set(room.inviteToken, room.id);
}

export function createRoom(params: {
  ownerGuestId: string;
  duration: number;
  maxMembers: number;
  paymentId: string;
  inviteToken: string;
}): Room {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + params.duration * 60 * 1000);

  const room: Room = {
    id,
    inviteToken: params.inviteToken,
    ownerGuestId: params.ownerGuestId,
    duration: params.duration,
    maxMembers: params.maxMembers,
    status: 'ACTIVE',
    paymentId: params.paymentId,
    expiresAt,
    createdAt: new Date(),
  };

  cacheRoom(room);
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return getStore().rooms.get(roomId);
}

export function getRoomByInviteToken(token: string): Room | undefined {
  const store = getStore();
  const id = store.tokenIndex.get(token);
  if (!id) return undefined;
  return store.rooms.get(id);
}

export function setRoomStatus(roomId: string, status: RoomStatus): Room | undefined {
  const room = getStore().rooms.get(roomId);
  if (!room) return undefined;
  room.status = status;
  return room;
}

export function expireRoom(roomId: string): Room | undefined {
  return setRoomStatus(roomId, 'EXPIRED');
}

export function markRoomFull(roomId: string): Room | undefined {
  return setRoomStatus(roomId, 'FULL');
}

export function deleteRoom(roomId: string): boolean {
  const store = getStore();
  const room = store.rooms.get(roomId);
  if (!room) return false;
  store.rooms.delete(roomId);
  store.tokenIndex.delete(room.inviteToken);
  return true;
}

export function getAllActiveRooms(): Room[] {
  const now = Date.now();
  return Array.from(getStore().rooms.values()).filter(
    (r) => r.status !== 'EXPIRED' && r.expiresAt.getTime() > now
  );
}

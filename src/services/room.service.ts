import prisma from '@/lib/prisma';
import { redis, REDIS_KEYS, SESSION_TTL } from '@/lib/redis';
import type { Room, RoomStatus } from '@prisma/client';

export interface CreateRoomParams {
  inviterDarkId: string;
  inviteeDarkId: string;
}

export interface CreateRoomResult {
  success: true;
  room: Room;
}

export interface CreateRoomError {
  success: false;
  error: string;
}

export async function createRoomService(
  params: CreateRoomParams
): Promise<CreateRoomResult | CreateRoomError> {
  const { inviterDarkId, inviteeDarkId } = params;

  // Check if inviter is trying to invite themselves
  if (inviterDarkId === inviteeDarkId) {
    return {
      success: false,
      error: 'Cannot create a room with yourself.',
    };
  }

  // Check if a pending room already exists
  const existingRoom = await prisma.room.findFirst({
    where: {
      OR: [
        { darkIdA: inviterDarkId, darkIdB: inviteeDarkId },
        { darkIdA: inviteeDarkId, darkIdB: inviterDarkId },
      ],
      status: 'PENDING',
    },
  });

  if (existingRoom) {
    return {
      success: false,
      error: 'A pending invitation already exists for this Dark ID.',
    };
  }

  const expiresAt = new Date(Date.now() + SESSION_TTL * 1000);

  try {
    const room = await prisma.room.create({
      data: {
        darkIdA: inviterDarkId,
        darkIdB: inviteeDarkId,
        status: 'PENDING',
        expiresAt,
      },
    });

    // Cache room metadata in Redis
    await redis.hset(REDIS_KEYS.roomMeta(room.id), {
      darkIdA: room.darkIdA,
      darkIdB: room.darkIdB || '',
      status: room.status,
      expiresAt: room.expiresAt.toISOString(),
    });
    await redis.expire(REDIS_KEYS.roomMeta(room.id), SESSION_TTL);

    return { success: true, room };
  } catch (error) {
    console.error('Failed to create room:', error);
    return {
      success: false,
      error: 'Failed to create room. Please try again.',
    };
  }
}

export async function getRoomService(roomId: string): Promise<Room | null> {
  // Try Redis first
  const cached = await redis.hgetall(REDIS_KEYS.roomMeta(roomId));

  if (cached && cached.darkIdA) {
    return {
      id: roomId,
      darkIdA: cached.darkIdA,
      darkIdB: cached.darkIdB || null,
      status: cached.status as RoomStatus,
      createdAt: new Date(),
      expiresAt: new Date(cached.expiresAt),
    } as Room;
  }

  // Fallback to database
  return prisma.room.findUnique({ where: { id: roomId } });
}

export async function updateRoomStatusService(
  roomId: string,
  status: RoomStatus
): Promise<Room | null> {
  try {
    const room = await prisma.room.update({
      where: { id: roomId },
      data: { status },
    });

    // Update Redis cache
    await redis.hset(REDIS_KEYS.roomMeta(roomId), {
      status: room.status,
    });

    return room;
  } catch (error) {
    console.error('Failed to update room status:', error);
    return null;
  }
}

export async function closeRoomService(
  roomId: string
): Promise<{ success: boolean }> {
  try {
    await prisma.room.update({
      where: { id: roomId },
      data: { status: 'EXPIRED' },
    });

    // Clean up Redis
    await redis.del(REDIS_KEYS.roomMeta(roomId));
    await redis.del(REDIS_KEYS.roomRecent(roomId));
    await redis.del(REDIS_KEYS.roomTyping(roomId));

    return { success: true };
  } catch (error) {
    console.error('Failed to close room:', error);
    return { success: false };
  }
}

export async function getRoomsByDarkIdService(
  darkId: string
): Promise<Room[]> {
  return prisma.room.findMany({
    where: {
      OR: [{ darkIdA: darkId }, { darkIdB: darkId }],
      status: { in: ['PENDING', 'ACTIVE'] },
    },
    orderBy: { createdAt: 'desc' },
  });
}

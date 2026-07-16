import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRoomByInviteTokenService, joinRoomService, getRoomMemberListService } from '@/services/room.service';
import { getOrCreateGuestId } from '@/lib/guest';
import { checkRateLimit } from '@/lib/rateLimit';

const joinSchema = z.object({
  handle: z
    .string()
    .trim()
    .min(1, 'Biệt danh không được để trống')
    .max(24, 'Biệt danh tối đa 24 ký tự'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const guestId = getOrCreateGuestId();
    const { allowed } = await checkRateLimit(guestId, 'room_join');
    if (!allowed) {
      return NextResponse.json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const validation = joinSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const room = await getRoomByInviteTokenService(params.token);
    if (!room) {
      return NextResponse.json(
        { error: 'Phòng không tồn tại.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (room.status === 'EXPIRED' || room.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Phòng đã hết hạn.', code: 'EXPIRED' }, { status: 410 });
    }

    const result = await joinRoomService(params.token, guestId, validation.data.handle);
    if (!result.success) {
      const status = result.code === 'FULL' ? 409 : result.code === 'EXPIRED' ? 410 : 404;
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status }
      );
    }

    const members = await getRoomMemberListService(result.room!.id);

    return NextResponse.json({
      room: {
        id: result.room!.id,
        inviteToken: result.room!.inviteToken,
        duration: result.room!.duration,
        maxMembers: result.room!.maxMembers,
        status: result.room!.status,
        expiresAt: result.room!.expiresAt.toISOString(),
        isOwner: result.room!.ownerGuestId === guestId,
      },
      guestId,
      handle: validation.data.handle,
      memberCount: result.members,
      members: members.map((m) => ({ handle: m.handle, isOwner: m.isOwner })),
    });
  } catch (error) {
    console.error('Join room error:', error);
    return NextResponse.json({ error: 'Không thể tham gia phòng.' }, { status: 500 });
  }
}
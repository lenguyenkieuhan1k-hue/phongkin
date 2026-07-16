import { NextRequest, NextResponse } from 'next/server';
import {
  bindOwnerIfPendingService,
  getRoomByInviteTokenService,
  getRoomMemberListService,
} from '@/services/room.service';
import { getOrCreateGuestId } from '@/lib/guest';
import { checkRateLimit } from '@/lib/rateLimit';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const guestId = getOrCreateGuestId();
    const { allowed } = await checkRateLimit(guestId, 'room_access');
    if (!allowed) {
      return NextResponse.json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại.' }, { status: 429 });
    }

    const room = await getRoomByInviteTokenService(params.token);
    if (!room) {
      return NextResponse.json(
        { error: 'Phòng không tồn tại hoặc đã hết hạn.' },
        { status: 404 }
      );
    }

    if (room.status === 'EXPIRED' || room.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Phòng đã hết hạn.', code: 'EXPIRED' }, { status: 410 });
    }

    // Claim owner nếu còn pending (chỉ user đầu tiên mở link thành công)
    const bound = await bindOwnerIfPendingService(room.id, guestId);
    const finalRoom = bound?.room ?? room;
    const isOwner = bound?.isOwner ?? finalRoom.ownerGuestId === guestId;

    const members = await getRoomMemberListService(finalRoom.id);

    return NextResponse.json({
      room: {
        id: finalRoom.id,
        inviteToken: finalRoom.inviteToken,
        duration: finalRoom.duration,
        maxMembers: finalRoom.maxMembers,
        status: finalRoom.status,
        expiresAt: finalRoom.expiresAt.toISOString(),
        isOwner,
      },
      guestId,
      memberCount: members.length,
      members: members.map((m) => ({ handle: m.handle, isOwner: m.isOwner })),
    });
  } catch (error) {
    console.error('Room resolve error:', error);
    return NextResponse.json({ error: 'Không thể truy cập phòng.' }, { status: 500 });
  }
}
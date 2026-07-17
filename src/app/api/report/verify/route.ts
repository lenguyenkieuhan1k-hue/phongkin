import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { addReportRoomGuest } from '@/socket/auth.middleware';
import { reportMessages } from '@/lib/report-messages';

export async function POST(req: NextRequest) {
  try {
    const { handle } = await req.json();

    if (!handle || typeof handle !== 'string') {
      return NextResponse.json({ error: 'Biệt danh không hợp lệ.' }, { status: 400 });
    }

    const trimmed = handle.trim();
    if (trimmed.length < 1 || trimmed.length > 24) {
      return NextResponse.json({ error: 'Biệt danh phải từ 1-24 ký tự.' }, { status: 400 });
    }

    const guestId = uuidv4();

    // Add to auth middleware's guest list
    addReportRoomGuest(guestId, trimmed);

    // Create expiration (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    return NextResponse.json({
      success: true,
      guestId,
      roomId: 'REPORT_ROOM',
      inviteToken: 'REPORT_ROOM',
      expiresAt: expiresAt.toISOString(),
      roomStatus: 'ACTIVE',
      memberCount: 1,
      handle: trimmed,
    });
  } catch (error) {
    console.error('[Report Verify]', error);
    return NextResponse.json({ error: 'Lỗi server.' }, { status: 500 });
  }
}

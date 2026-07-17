import { NextRequest, NextResponse } from 'next/server';
import { createReportRoomToken } from '@/socket/auth.middleware';

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

    // Create a signed token containing guestId and handle
    // This token is self-contained and verifiable by the socket server
    const token = createReportRoomToken(trimmed, trimmed);

    // Create expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return NextResponse.json({
      success: true,
      guestId: token, // The token IS the guestId for report room
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

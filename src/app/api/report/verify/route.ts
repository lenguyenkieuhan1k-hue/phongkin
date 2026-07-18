import { NextRequest, NextResponse } from 'next/server';
import { createReportRoomToken } from '@/socket/auth.middleware';

const REPORT_PASSWORD = process.env.REPORT_ROOM_PASSWORD || 'darktalk2026';

export async function POST(req: NextRequest) {
  try {
    const { password, handle } = await req.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Mật khẩu không hợp lệ.' }, { status: 400 });
    }

    if (password !== REPORT_PASSWORD) {
      return NextResponse.json({ error: 'Mật khẩu không đúng.' }, { status: 401 });
    }

    if (!handle || typeof handle !== 'string') {
      return NextResponse.json({ error: 'Biệt danh không hợp lệ.' }, { status: 400 });
    }

    const trimmed = handle.trim();
    if (trimmed.length < 1 || trimmed.length > 24) {
      return NextResponse.json({ error: 'Biệt danh phải từ 1-24 ký tự.' }, { status: 400 });
    }

    const token = createReportRoomToken(trimmed, trimmed);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return NextResponse.json({
      success: true,
      guestId: token,
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

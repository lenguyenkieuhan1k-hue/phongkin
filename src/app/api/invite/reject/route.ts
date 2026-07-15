import { NextRequest, NextResponse } from 'next/server';
import { getSessionService } from '@/services/session.service';
import { rejectInviteService } from '@/services/invite.service';

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSessionService(token);

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { roomId } = body;

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    const result = await rejectInviteService(session.darkId, roomId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invite reject error:', error);
    return NextResponse.json(
      { error: 'Failed to reject invitation' },
      { status: 500 }
    );
  }
}

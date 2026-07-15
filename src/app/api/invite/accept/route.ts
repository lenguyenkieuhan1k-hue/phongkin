import { NextRequest, NextResponse } from 'next/server';
import { getSessionService } from '@/services/session.service';
import { acceptInviteService } from '@/services/invite.service';
import { emitToUser } from '@/socket';

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

    const result = await acceptInviteService(session.darkId, roomId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Notify both users that room is active
    const room = result.room;
    const otherDarkId = room.darkIdA === session.darkId ? room.darkIdB : room.darkIdA;

    if (otherDarkId) {
      emitToUser(otherDarkId, 'room:invite-accepted', {
        roomId: room.id,
        acceptedByDarkId: session.darkId,
      });
    }
    emitToUser(session.darkId, 'room:invite-accepted', {
      roomId: room.id,
      acceptedByDarkId: session.darkId,
    });

    return NextResponse.json({
      roomId: result.room.id,
      status: result.room.status,
    });
  } catch (error) {
    console.error('Invite accept error:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
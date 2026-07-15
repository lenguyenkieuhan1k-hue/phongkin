import { NextRequest, NextResponse } from 'next/server';
import { getSessionService } from '@/services/session.service';
import { sendInviteService } from '@/services/invite.service';
import { inviteSchema } from '@/lib/validators';
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
    const validation = inviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const result = await sendInviteService(
      session.darkId,
      validation.data.targetDarkId,
      session.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Emit invitation to TARGET user only via Socket.IO
    const delivered = emitToUser(
      validation.data.targetDarkId,
      'room:invite',
      {
        roomId: result.room.id,
        fromDarkId: session.darkId,
        status: result.room.status,
      }
    );

    console.log(`[invite:send] from=${session.darkId} to=${validation.data.targetDarkId} room=${result.room.id} delivered=${delivered}`);

    return NextResponse.json({
      roomId: result.room.id,
      expiresAt: result.room.expiresAt,
      targetOnline: delivered,
    });
  } catch (error) {
    console.error('Invite send error:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
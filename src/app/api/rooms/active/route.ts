import { NextRequest, NextResponse } from 'next/server';
import { getSessionService } from '@/services/session.service';
import { getActiveRoomsForUserService } from '@/services/invite.service';

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSessionService(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const rooms = await getActiveRoomsForUserService(session.darkId);
    return NextResponse.json({ rooms });
  } catch (error) {
    console.error('Active rooms error:', error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}
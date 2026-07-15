import { NextRequest, NextResponse } from 'next/server';
import { getSessionByToken } from '@/lib/auth';

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

    const session = await getSessionByToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        token: session.token,
        darkId: session.darkId,
        handle: session.handle,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      }
    });
  } catch (error) {
    console.error('Session validate error:', error);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}

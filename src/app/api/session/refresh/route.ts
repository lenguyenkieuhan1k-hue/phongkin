import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionService, refreshSessionService } from '@/services/session.service';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('sessionToken')?.value;

    if (!token) {
      return NextResponse.json({ session: null });
    }

    const session = await getSessionService(token);

    if (!session) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({
      session: {
        token: session.token,
        darkId: session.darkId,
        handle: session.handle,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('Session get error:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('sessionToken')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const session = await refreshSessionService(token);

    if (!session) {
      return NextResponse.json(
        { error: 'Session expired or invalid' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      session: {
        token: session.token,
        darkId: session.darkId,
        handle: session.handle,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('Session refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    );
  }
}

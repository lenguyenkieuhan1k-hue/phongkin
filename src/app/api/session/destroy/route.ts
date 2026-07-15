import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { destroySessionService } from '@/services/session.service';

export async function DELETE() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('sessionToken')?.value;

    if (token) {
      await destroySessionService(token);
    }

    const response = NextResponse.json({ success: true });

    // Clear cookie
    response.cookies.set('sessionToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Session destroy error:', error);
    return NextResponse.json(
      { error: 'Failed to destroy session' },
      { status: 500 }
    );
  }
}

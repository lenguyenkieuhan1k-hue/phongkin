import { NextResponse } from 'next/server';
import { createSessionService } from '@/services/session.service';

export async function POST() {
  try {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '127.0.0.1',
      },
    });

    const result = await createSessionService(request);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, retryAfter: result.retryAfter },
        { status: 429 }
      );
    }

    const response = NextResponse.json({
      sessionToken: result.session.token,
      darkId: result.session.darkId,
      expiresAt: result.session.expiresAt,
    });

    // Set HttpOnly cookie
    response.cookies.set('sessionToken', result.session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Session create error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

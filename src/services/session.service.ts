import {
  createSession,
  getSessionByToken,
  getSessionByDarkId,
  destroySession,
  extendSession,
} from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import type { Session } from '@prisma/client';

export interface CreateSessionResult {
  success: true;
  session: Session;
}

export interface CreateSessionError {
  success: false;
  error: string;
  retryAfter?: number;
}

export async function createSessionService(
  request: Request
): Promise<CreateSessionResult | CreateSessionError> {
  const ip = getClientIp(request);
  const { allowed, resetAt } = await checkRateLimit(ip, 'session');

  if (!allowed) {
    return {
      success: false,
      error: 'Too many sessions created. Please try again later.',
      retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
    };
  }

  try {
    const session = await createSession(ip);
    return { success: true, session };
  } catch (error) {
    console.error('Failed to create session:', error);
    return {
      success: false,
      error: 'Failed to create session. Please try again.',
    };
  }
}

export async function getSessionService(
  token: string
): Promise<Session | null> {
  return getSessionByToken(token);
}

export async function getSessionByDarkIdService(
  darkId: string
): Promise<Session | null> {
  return getSessionByDarkId(darkId);
}

export async function destroySessionService(
  token: string
): Promise<{ success: boolean }> {
  try {
    await destroySession(token);
    return { success: true };
  } catch (error) {
    console.error('Failed to destroy session:', error);
    return { success: false };
  }
}

export async function refreshSessionService(
  token: string
): Promise<Session | null> {
  return extendSession(token);
}

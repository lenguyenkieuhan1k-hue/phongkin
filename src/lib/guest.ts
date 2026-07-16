/**
 * Guest identity cho phòng chat.
 * - Không phải user account, không cần đăng ký.
 * - Mỗi visitor được cấp 1 guestId (nanoid 16) lưu trong cookie không-HttpOnly.
 * - guestId dùng để identify member trong phòng, không phải session.
 */

import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

const GUEST_COOKIE = 'phongkin_guest';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function generateGuestId(): string {
  return nanoid(16);
}

export function getOrCreateGuestId(): string {
  const store = cookies();
  let guestId = store.get(GUEST_COOKIE)?.value;

  if (!guestId) {
    guestId = generateGuestId();
    store.set(GUEST_COOKIE, guestId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }

  return guestId;
}

export function setGuestCookie(guestId: string): void {
  const store = cookies();
  store.set(GUEST_COOKIE, guestId, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

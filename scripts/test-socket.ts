/**
 * Smoke test Socket.IO realtime chat.
 * - Tạo room → connect 2 socket với guestId khác nhau → join → send message → verify broadcast
 */

import { io, Socket } from 'socket.io-client';

const BASE_URL = 'http://localhost:3000';
const TOKEN = process.argv[2];
const GUEST1 = 'guest_' + Math.random().toString(36).slice(2, 10);
const GUEST2 = 'guest_' + Math.random().toString(36).slice(2, 10);

if (!TOKEN) {
  console.error('Usage: tsx scripts/test-socket.ts <inviteToken>');
  process.exit(1);
}

console.log(`[test] inviteToken=${TOKEN}`);
console.log(`[test] guest1=${GUEST1}, guest2=${GUEST2}`);

const sock1: Socket = io(BASE_URL, {
  auth: { roomToken: TOKEN, guestId: GUEST1 },
  transports: ['websocket'],
});

const sock2: Socket = io(BASE_URL, {
  auth: { roomToken: TOKEN, guestId: GUEST2 },
  transports: ['websocket'],
});

let testPassed = false;
const timeout = setTimeout(() => {
  if (!testPassed) {
    console.error('[test] TIMEOUT - did not receive all expected events');
    process.exit(1);
  }
}, 10000);

sock1.on('connect', () => {
  console.log('[sock1] connected');
  sock1.emit('room:join');
});

sock2.on('connect', () => {
  console.log('[sock2] connected');
  sock2.emit('room:join');
});

sock1.on('room:joined', (data: any) => {
  console.log('[sock1] joined room, members:', data.memberCount);

  // Đợi sock2 join xong rồi gửi message
  setTimeout(() => {
    console.log('[sock1] sending message...');
    sock1.emit('message:send', {
      type: 'TEXT',
      body: 'Hello from sock1!',
    });
  }, 500);
});

sock2.on('room:joined', (data: any) => {
  console.log('[sock2] joined room, members:', data.memberCount);
});

sock2.on('message:new', (msg: any) => {
  console.log('[sock2] received message:', msg.body, 'from:', msg.senderGuestId.slice(0, 8));
  if (msg.body === 'Hello from sock1!' && msg.senderGuestId === GUEST1) {
    console.log('[test] ✅ PASSED: realtime broadcast works');
    testPassed = true;
    clearTimeout(timeout);
    sock1.disconnect();
    sock2.disconnect();
    setTimeout(() => process.exit(0), 200);
  }
});

sock1.on('connect_error', (err) => console.error('[sock1] error:', err.message));
sock2.on('connect_error', (err) => console.error('[sock2] error:', err.message));
sock1.on('error', (err) => console.error('[sock1] error event:', err));
sock2.on('error', (err) => console.error('[sock2] error event:', err));

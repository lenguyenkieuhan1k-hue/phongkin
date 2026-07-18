// Real-time chat test: 2 client join room, A sends, B receives
const { io } = require('socket.io-client');

const URL = 'https://phongkin.pro';
const ROOM_TOKEN = 'jAtFb9Gu8nMnumuQQc';
const GUEST_A = 'testA-' + Date.now();
const GUEST_B = 'testB-' + Date.now();

const HANDLE_A = 'Alice';
const HANDLE_B = 'Bob';

function makeClient(name, guestId, handle) {
  const sock = io(URL, {
    auth: { roomToken: ROOM_TOKEN, guestId },
    transports: ['websocket', 'polling'],
    reconnection: false,
    timeout: 15000,
  });

  sock.on('connect', () => {
    console.log(`[${name}] connected sid=${sock.id}`);
    sock.emit('room:join');
  });

  sock.on('connect_error', (e) => console.log(`[${name}] connect_error`, e.message));

  sock.onAny((event, ...args) => {
    if (event === 'typing:update') return;
    if (event === 'presence:heartbeat') return;
    if (event === 'presence:ack') return;
    console.log(`[${name}] ${event}`, JSON.stringify(args[0]).slice(0, 300));
  });

  return sock;
}

(async () => {
  const a = makeClient('A', GUEST_A, HANDLE_A);
  const b = makeClient('B', GUEST_B, HANDLE_B);

  // Wait for both join
  await new Promise((r) => setTimeout(r, 4000));

  console.log('=== A sends message ===');
  a.emit('message:send', { type: 'TEXT', body: 'Xin chào từ A - ' + Date.now() });

  await new Promise((r) => setTimeout(r, 3000));

  console.log('=== A sends another ===');
  a.emit('message:send', { type: 'TEXT', body: 'Tin thứ 2 từ A' });

  await new Promise((r) => setTimeout(r, 3000));

  console.log('=== B sends ===');
  b.emit('message:send', { type: 'TEXT', body: 'Tin từ B' });

  await new Promise((r) => setTimeout(r, 3000));

  a.disconnect();
  b.disconnect();
  console.log('=== DONE ===');
  process.exit(0);
})();
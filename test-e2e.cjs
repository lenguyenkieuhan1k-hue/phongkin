// Test thực tế end-to-end qua landing page → vào phòng → gửi message
const { io } = require('socket.io-client');

const URL = 'https://phongkin.pro';
const ROOM_TOKEN = 'jAtFb9Gu8nMnumuQQc';

(async () => {
  // Bước 1: GET landing để lấy cookie session (nếu có)
  const landingRes = await fetch(`${URL}/r/${ROOM_TOKEN}`);
  const cookies = landingRes.headers.getSetCookie ? landingRes.headers.getSetCookie() : [];
  const setCookie = landingRes.headers.get('set-cookie');
  console.log('[1] GET /r/<token> status:', landingRes.status);
  console.log('[1] cookies:', cookies.length || (setCookie ? 1 : 0));

  // Bước 2: POST join để lấy guestId
  const joinRes = await fetch(`${URL}/api/rooms/${ROOM_TOKEN}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies.join('; ') || '',
    },
    body: JSON.stringify({ handle: 'TestUser1', theme: 'romance' }),
  });
  const joinData = await joinRes.json();
  console.log('[2] POST /api/rooms/<token>/join status:', joinRes.status);
  console.log('[2] join response:', JSON.stringify(joinData).slice(0, 500));
  const guestId = joinData.guestId || joinData.member?.guestId;
  console.log('[2] guestId:', guestId);

  if (!guestId) {
    console.error('FAIL: no guestId');
    process.exit(1);
  }

  // Bước 3: Connect socket với guestId thật
  const sock = io(URL, {
    auth: { roomToken: ROOM_TOKEN, guestId },
    transports: ['websocket', 'polling'],
    reconnection: false,
    timeout: 15000,
  });

  sock.on('connect', () => {
    console.log('[3] socket connected, sid=', sock.id);
    sock.emit('room:join');
  });

  sock.onAny((event, ...args) => {
    if (event === 'typing:update') return;
    if (event === 'presence:heartbeat' || event === 'presence:ack') return;
    console.log(`[3] RECV ${event}:`, JSON.stringify(args[0]).slice(0, 400));
  });

  // Wait for room:joined
  await new Promise((resolve) => {
    sock.on('room:joined', () => {
      console.log('[3] ROOM JOINED OK');
      resolve();
    });
    setTimeout(() => { console.error('[3] TIMEOUT waiting for room:joined'); resolve(); }, 8000);
  });

  await new Promise((r) => setTimeout(r, 1500));

  // Bước 4: Gửi message
  console.log('[4] emitting message:send...');
  sock.emit('message:send', { type: 'TEXT', body: 'Hello from test ' + Date.now() });

  await new Promise((r) => setTimeout(r, 3000));

  console.log('[5] DONE');
  sock.disconnect();
  process.exit(0);
})();
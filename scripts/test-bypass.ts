async function main() {
  const res = await fetch('http://localhost:3000/api/payment/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ duration: 60, maxMembers: 5 }),
  });
  const data = await res.json();
  console.log('STATUS:', res.status);
  console.log(JSON.stringify(data, null, 2));

  if (!data.inviteToken || !data.roomId || data.status !== 'SUCCESS') {
    console.error('FAIL: missing roomId/inviteToken or status != SUCCESS');
    process.exit(1);
  }

  const roomRes = await fetch(`http://localhost:3000/api/rooms/${data.inviteToken}`);
  const room = await roomRes.json();
  console.log('ROOM CHECK status:', roomRes.status);
  console.log('ROOM data:', JSON.stringify(room, null, 2));

  if (roomRes.status !== 200 || !room.id) {
    console.error('FAIL: room not accessible via token');
    process.exit(1);
  }

  console.log('\nPASS: bypass OK, room token =', data.inviteToken);
}

main().catch((e) => { console.error(e); process.exit(1); });
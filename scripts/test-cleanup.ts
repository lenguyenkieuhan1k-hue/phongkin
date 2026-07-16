/**
 * Test room cleanup mới:
 * - Tạo room hết hạn + có 1 message + 1 member
 * - Đợi cron (60s + grace)
 * - Verify:
 *   ✓ Room bị xóa khỏi DB
 *   ✓ Member bị xóa (cascade)
 *   ✓ Message bị xóa (cascade)
 *   ✓ Attachment (nếu có) bị xóa (cascade)
 *   ✓ API trả 404
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('[cleanup] creating test room with message...');

  const token = 'clean' + Math.random().toString(36).slice(2, 10);
  const room = await prisma.room.create({
    data: {
      inviteToken: token,
      ownerGuestId: 'test_owner',
      duration: 1,
      maxMembers: 5,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() - 30 * 1000), // expired 30s ago
    },
  });
  console.log(`[cleanup] room created: ${room.id}, token: ${token}`);

  // Thêm member
  const member = await prisma.roomMember.create({
    data: { roomId: room.id, guestId: 'test_member', handle: 'Member 1' },
  });
  console.log(`[cleanup] member created: ${member.id}`);

  // Thêm message
  const msg = await prisma.message.create({
    data: {
      roomId: room.id,
      senderGuestId: 'test_owner',
      senderHandle: 'Chủ phòng',
      type: 'TEXT',
      body: 'Hello, sắp bị xóa!',
    },
  });
  console.log(`[cleanup] message created: ${msg.id}`);

  // Verify trước
  const before = {
    rooms: await prisma.room.count({ where: { id: room.id } }),
    members: await prisma.roomMember.count({ where: { roomId: room.id } }),
    messages: await prisma.message.count({ where: { roomId: room.id } }),
  };
  console.log('[cleanup] BEFORE:', before);
  if (before.rooms !== 1 || before.members !== 1 || before.messages !== 1) {
    throw new Error('Seed failed');
  }

  // Đợi cron
  console.log('[cleanup] waiting 70s for cron...');
  await new Promise((r) => setTimeout(r, 70 * 1000));

  // Verify sau
  const after = {
    rooms: await prisma.room.count({ where: { id: room.id } }),
    members: await prisma.roomMember.count({ where: { roomId: room.id } }),
    messages: await prisma.message.count({ where: { roomId: room.id } }),
  };
  console.log('[cleanup] AFTER:', after);

  // Test API
  const res = await fetch(`${BASE_URL}/api/rooms/${token}`);
  console.log(`[cleanup] API status: ${res.status} (expected 404)`);

  const allPassed =
    after.rooms === 0 &&
    after.members === 0 &&
    after.messages === 0 &&
    res.status === 404;

  if (!allPassed) {
    console.error('[cleanup] ❌ FAILED');
    process.exit(1);
  }

  console.log('[cleanup] ✅ PASSED — Room + Members + Messages đã bị XÓA hoàn toàn');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
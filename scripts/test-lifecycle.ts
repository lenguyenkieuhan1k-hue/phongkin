/**
 * Test room lifecycle (cron cleanup).
 * - Tạo room đã hết hạn
 * - Verify cron expire nó
 * - Verify room không join được nữa
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('[lifecycle] creating expired room...');
  const token = 'lifecycle' + Math.random().toString(36).slice(2, 10);
  const room = await prisma.room.create({
    data: {
      inviteToken: token,
      ownerGuestId: 'lifecycle_test',
      duration: 1,
      maxMembers: 2,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() - 60 * 1000), // expired 1 min ago
    },
  });
  console.log(`[lifecycle] room created: ${room.inviteToken}, expiresAt: ${room.expiresAt.toISOString()}`);

  // Wait ~65s for cron (60s interval + 10s grace)
  console.log('[lifecycle] waiting 70s for cron to expire room...');
  await new Promise((r) => setTimeout(r, 70 * 1000));

  const updated = await prisma.room.findUnique({ where: { id: room.id } });
  console.log(`[lifecycle] room status now: ${updated?.status}`);

  if (updated?.status !== 'EXPIRED') {
    console.error('[lifecycle] ❌ FAILED: room not expired');
    process.exit(1);
  }

  // Verify cannot join
  console.log('[lifecycle] verifying cannot join...');
  const res = await fetch(`${BASE_URL}/api/rooms/${token}`);
  console.log(`[lifecycle] join response: ${res.status}`);
  if (res.status !== 410 && res.status !== 404) {
    console.error('[lifecycle] ❌ FAILED: should reject expired room');
    process.exit(1);
  }

  console.log('[lifecycle] ✅ PASSED');
  await prisma.room.delete({ where: { id: room.id } });
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import prisma from '@/lib/prisma';

async function main() {
  console.log('Seeding database...');

  // Create test sessions
  const session1 = await prisma.session.create({
    data: {
      token: 'test-token-1',
      darkId: 'DT-TEST-M001',
      handle: 'TestUser1',
      ipHash: 'test-hash-1',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
  });

  const session2 = await prisma.session.create({
    data: {
      token: 'test-token-2',
      darkId: 'DT-TEST-M002',
      handle: 'TestUser2',
      ipHash: 'test-hash-2',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
  });

  console.log('Created test sessions:', session1.darkId, session2.darkId);

  // Create a test room
  const room = await prisma.room.create({
    data: {
      darkIdA: session1.darkId,
      darkIdB: session2.darkId,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
  });

  console.log('Created test room:', room.id);

  // Add members
  await prisma.roomMember.createMany({
    data: [
      { roomId: room.id, sessionId: session1.id },
      { roomId: room.id, sessionId: session2.id },
    ],
  });

  console.log('Added room members');

  // Create test messages
  await prisma.message.createMany({
    data: [
      {
        roomId: room.id,
        senderId: session1.id,
        type: 'TEXT',
        body: 'Hello! This is a test message.',
      },
      {
        roomId: room.id,
        senderId: session2.id,
        type: 'TEXT',
        body: 'Hi there! Nice to meet you.',
      },
      {
        roomId: room.id,
        senderId: session1.id,
        type: 'TEXT',
        body: 'Welcome to DarkTalk!',
      },
    ],
  });

  console.log('Created test messages');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

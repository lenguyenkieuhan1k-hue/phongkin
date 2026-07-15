// Background cleanup jobs for anti-forensic data lifecycle.
//
// DarkTalk design: ALL data (sessions, messages, attachments) auto-expires
// after 2 hours. This service runs on a schedule to purge expired data.
//
// Run once on app startup (idempotent), and schedule via PM2 cron or system cron.

import prisma from './prisma';
import { purgeExpiredSessions } from './auth.prisma';
import { purgeOldMessages } from './messages.prisma';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * Run all cleanup tasks. Safe to call repeatedly.
 * Returns a summary of what was purged.
 */
export async function runCleanup(): Promise<{
  sessions: number;
  messages: number;
  attachments: number;
  rooms: number;
}> {
  const [sessions, msgResult, rooms] = await Promise.all([
    purgeExpiredSessions(),
    purgeOldMessages(TWO_HOURS_MS),
    prisma.room.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    }),
  ]);

  if (sessions > 0 || msgResult.messages > 0 || rooms.count > 0) {
    console.log(
      `[cleanup] purged: ${sessions} sessions, ${msgResult.messages} messages, ${msgResult.attachments} attachments, ${rooms.count} rooms`
    );
  }

  return {
    sessions,
    messages: msgResult.messages,
    attachments: msgResult.attachments,
    rooms: rooms.count,
  };
}

/**
 * Start the cleanup loop. Runs every 10 minutes.
 * Returns a stop function for graceful shutdown.
 */
export function startCleanupLoop(intervalMs: number = 10 * 60 * 1000): () => void {
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;

  const tick = async () => {
    if (stopped) return;
    try {
      await runCleanup();
    } catch (err) {
      console.error('[cleanup] error:', err);
    }
    if (!stopped) {
      timer = setTimeout(tick, intervalMs);
    }
  };

  // First run after a short delay (let server finish boot)
  timer = setTimeout(tick, 30 * 1000);

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

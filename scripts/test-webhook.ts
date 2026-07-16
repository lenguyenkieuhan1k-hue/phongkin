/**
 * Test SePay webhook locally.
 * Usage: tsx scripts/test-webhook.ts <paymentId>
 *
 * Sẽ simulate một webhook từ SePay để verify flow end-to-end.
 */

import { handleWebhookService } from '../src/services/payment.service';

async function main() {
  const paymentId = process.argv[2];
  if (!paymentId) {
    console.error('Usage: tsx scripts/test-webhook.ts <paymentId>');
    process.exit(1);
  }

  const payload = {
    id: Date.now(),
    gateway: 'TestBank',
    transactionDate: new Date().toISOString(),
    accountNumber: '0000000000',
    content: `PK ${paymentId.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    transferType: 'in' as const,
    transferAmount: 49000,
    referenceCode: 'TEST' + Date.now(),
  };

  console.log('[test-webhook] sending payload:', payload);

  const result = await handleWebhookService(payload);
  console.log('[test-webhook] result:', result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * SePay wrapper for Phòng Kín.
 *
 * Có 2 flows:
 *   1. Tạo QR thanh toán: trả về qrContent (URL ảnh QR) + sepayRef (mã nội dung CK).
 *      Người dùng quét QR bằng app ngân hàng → CK vào tài khoản SePay.
 *   2. Webhook: SePay gọi về khi có giao dịch → server verify → tạo Room.
 *
 * Trong dev (sandbox), webhook giả lập. Trong prod, dùng URL thật từ SePay.
 *
 * Env vars:
 *   SEPAY_ACCOUNT_NUMBER  - Số TK nhận tiền (VD: 0123456789)
 *   SEPAY_BANK            - Mã ngân hàng (VD: MBBank, Vietcombank)
 *   SEPAY_ACCOUNT_NAME    - Tên chủ TK
 *   SEPAY_WEBHOOK_SECRET  - HMAC-SHA256 secret key cho webhook
 */

import crypto from 'crypto';

const SEPAY_ACCOUNT_NUMBER = process.env.SEPAY_ACCOUNT_NUMBER || '0000000000';
const SEPAY_BANK = process.env.SEPAY_BANK || 'MBBank';
const SEPAY_ACCOUNT_NAME = process.env.SEPAY_ACCOUNT_NAME || 'PHONG KIN';

export interface SepayQrPayload {
  accountNumber: string;
  accountName: string;
  bank: string;
  amount: number;
  content: string;
}

export interface SepayWebhookPayload {
  id?: number | string;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  subAccount?: string | null;
  code?: string | null;
  content?: string;
  description?: string;
  transferType?: 'in' | 'out';
  transferAmount?: number;
  referenceCode?: string;
  accumulated?: number;
}

export function buildSepayReference(paymentId: string): string {
  const short = paymentId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `PK ${short}`;
}

export function buildQrContent(params: {
  amount: number;
  content: string;
}): string {
  const { amount, content } = params;
  return `https://qr.sepay.vn/img?acc=${SEPAY_ACCOUNT_NUMBER}&bank=${SEPAY_BANK}&amount=${amount}&des=${encodeURIComponent(content)}&template=compact`;
}

/**
 * Verify webhook payload (giả lập trong dev).
 * Trong prod cần verify signature bằng SEPAY_WEBHOOK_SECRET.
 */
export function verifySepayWebhook(
  payload: SepayWebhookPayload,
  expectedContent: string,
  expectedAmount: number
): { valid: boolean; reason?: string } {
  if (payload.transferType !== 'in') {
    return { valid: false, reason: 'Not inbound transfer' };
  }

  const payloadContent = (payload.content ?? '').replace(/\s/g, '');
  const expectedStripped = expectedContent.replace(/\s/g, '');
  if (!payloadContent.includes(expectedStripped)) {
    return { valid: false, reason: 'Content mismatch' };
  }

  if ((payload.transferAmount ?? 0) < expectedAmount) {
    return { valid: false, reason: 'Amount mismatch' };
  }

  return { valid: true };
}

export function parseSepayReference(content: string): string | null {
  const match = content.match(/PK\s*([A-Z0-9]{6,12})/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Verify SePay webhook signature using HMAC-SHA256.
 *
 * Theo docs SePay:
 * - Signature = sha256=HMAC_SHA256(secret, "{timestamp}.{rawBody}")
 * - Header: X-SePay-Signature: sha256=<hex>
 * - Header: X-SePay-Timestamp: <unix_seconds>
 * - Anti-replay: reject nếu |now - timestamp| > 5 phút
 */
export function verifySepaySignature(
  rawBody: string,
  signature: string,
  apiKey: string,
  timestamp?: string | null
): { valid: boolean; reason?: string } {
  try {
    if (!signature || !apiKey) {
      return { valid: false, reason: 'Missing signature or API key' };
    }

    // Anti-replay: check timestamp nếu có
    if (timestamp) {
      const ts = parseInt(timestamp, 10);
      if (Number.isFinite(ts)) {
        const nowSec = Math.floor(Date.now() / 1000);
        if (Math.abs(nowSec - ts) > 300) {
          return { valid: false, reason: 'Timestamp expired (replay protection)' };
        }
      }
    }

    // SePay signs: "{timestamp}.{rawBody}" - không phải chỉ rawBody
    const message = timestamp ? `${timestamp}.${rawBody}` : rawBody;
    const expectedSignature =
      'sha256=' +
      crypto.createHmac('sha256', apiKey).update(message).digest('hex');

    // timing-safe compare
    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expBuffer.length) {
      return { valid: false, reason: 'Signature length mismatch' };
    }
    if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      return { valid: false, reason: 'Signature mismatch' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Verification error' };
  }
}

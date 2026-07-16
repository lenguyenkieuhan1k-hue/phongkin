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
 *   SEPAY_WEBHOOK_URL     - URL server nhận callback (chỉ dùng cho info)
 *   SEPAY_API_KEY         - API key SePay (cho webhook verify)
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
  content?: string;
  transferType?: 'in' | 'out';
  transferAmount?: number;
  referenceCode?: string;
}

export function buildSepayReference(paymentId: string): string {
  // Format: PK <paymentId8>  → nội dung CK dễ nhận biết + dễ parse
  const short = paymentId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `PK ${short}`;
}

export function buildQrContent(params: {
  amount: number;
  content: string;
}): string {
  const { amount, content } = params;
  // URL template VietQR → SePay sẽ render ảnh QR
  return `https://qr.sepay.vn/img?acc=${SEPAY_ACCOUNT_NUMBER}&bank=${SEPAY_BANK}&amount=${amount}&des=${encodeURIComponent(content)}&template=compact`;
}

/**
 * Verify webhook payload (giả lập trong dev).
 * Trong prod cần verify signature bằng SEPAY_API_KEY.
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
 * SePay sends signature in header `x-sepay-signature` as HMAC-SHA256 of the raw body
 * using the API key as the secret.
 */
export function verifySepaySignature(
  rawBody: string,
  signature: string,
  apiKey: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(rawBody)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

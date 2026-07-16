/**
 * Payment service — SePay integration.
 *
 * Flow:
 *   1. createInvoice()    tạo Payment(PENDING) + sinh QR content
 *   2. handleWebhook()    SePay callback → verify → set SUCCESS + tạo Room
 *   3. getStatus()        polling cho client
 *   4. markExpired()      cron: payment quá 10p chưa trả → EXPIRED
 */

import prisma from '@/lib/prisma';
import {
  buildQrContent,
  buildSepayReference,
  parseSepayReference,
  verifySepayWebhook,
} from '@/lib/sepay';
import type { SepayWebhookPayload } from '@/lib/sepay';
export type { SepayWebhookPayload };
import { createRoomService } from './room.service';
import { createInviteToken } from '@/lib/invite-token';
import { BYPASS_PAYMENT, PAYMENT_TTL_SECONDS, getPrice, type Duration, type MaxMembers } from '@/lib/pricing';

export interface CreateInvoiceParams {
  duration: Duration;
  maxMembers: MaxMembers;
  guestId: string;
  agreedToTerms: boolean;
  agreedAt: Date;
  termsVersion: string;
}

export interface CreateInvoiceResult {
  paymentId: string;
  amount: number;
  qrContent: string;
  sepayRef: string;
  expiresAt: Date;
  // Khi BYPASS_PAYMENT=true: tạo phòng luôn
  roomId?: string;
  inviteToken?: string;
  status?: 'PENDING' | 'SUCCESS';
}

export async function createInvoiceService(
  params: CreateInvoiceParams
): Promise<CreateInvoiceResult> {
  if (!params.agreedToTerms) {
    throw new Error('User must agree to terms before creating payment');
  }

  const amount = getPrice(params.duration, params.maxMembers);
  const expiresAt = new Date(Date.now() + PAYMENT_TTL_SECONDS * 1000);

  const payment = await prisma.payment.create({
    data: {
      amount,
      duration: params.duration,
      maxMembers: params.maxMembers,
      status: BYPASS_PAYMENT ? 'SUCCESS' : 'PENDING',
      sepayRef: '',
      qrContent: '',
      agreedToTerms: params.agreedToTerms,
      agreedAt: params.agreedAt,
      termsVersion: params.termsVersion,
      expiresAt,
      paidAt: BYPASS_PAYMENT ? new Date() : null,
    },
  });

  const sepayRef = buildSepayReference(payment.id);
  const qrContent = buildQrContent({ amount, content: sepayRef });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { sepayRef, qrContent },
  });

  // Bypass: tạo phòng + trả về roomId luôn
  if (BYPASS_PAYMENT) {
    const inviteToken = createInviteToken();
    const room = await createRoomService({
      ownerGuestId: params.guestId,
      duration: params.duration,
      maxMembers: params.maxMembers,
      paymentId: payment.id,
      inviteToken,
    });
    console.log(`[payment] BYPASS — auto-created room=${room.id} token=${inviteToken}`);
    return {
      paymentId: payment.id,
      amount,
      qrContent,
      sepayRef,
      expiresAt,
      roomId: room.id,
      inviteToken,
      status: 'SUCCESS',
    };
  }

  return {
    paymentId: payment.id,
    amount,
    qrContent,
    sepayRef,
    expiresAt,
  };
}

export interface PaymentStatusResult {
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  amount: number;
  duration: number;
  maxMembers: number;
  sepayRef: string;
  inviteToken?: string;
  roomId?: string;
}

export async function getPaymentStatusService(
  paymentId: string
): Promise<PaymentStatusResult | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { room: true },
  });

  if (!payment) return null;

  const result: PaymentStatusResult = {
    status: payment.status as PaymentStatusResult['status'],
    amount: payment.amount,
    duration: payment.duration,
    maxMembers: payment.maxMembers,
    sepayRef: payment.sepayRef,
    inviteToken: payment.room?.inviteToken,
    roomId: payment.room?.id,
  };
  return result;
}

export interface HandleWebhookResult {
  success: boolean;
  message: string;
  paymentId?: string;
  roomId?: string;
}

/**
 * Xử lý webhook từ SePay. Idempotent: nếu payment đã SUCCESS thì trả về OK luôn.
 * Race-safe: dùng transaction + check status để tránh tạo 2 phòng khi 2 webhook đến đồng thời.
 */
export async function handleWebhookService(
  payload: SepayWebhookPayload
): Promise<HandleWebhookResult> {
  const refCode = parseSepayReference(payload.content ?? '');
  if (!refCode) {
    return { success: false, message: 'Cannot parse reference from content' };
  }

  const payment = await prisma.payment.findFirst({
    where: { sepayRef: { contains: refCode } },
    include: { room: true },
  });

  if (!payment) {
    return { success: false, message: 'Payment not found' };
  }

  if (payment.status === 'SUCCESS') {
    return {
      success: true,
      message: 'Already processed',
      paymentId: payment.id,
      roomId: payment.room?.id,
    };
  }

  if (payment.status === 'EXPIRED' || payment.expiresAt < new Date()) {
    return { success: false, message: 'Payment expired' };
  }

  const verification = verifySepayWebhook(payload, payment.sepayRef, payment.amount);
  if (!verification.valid) {
    return { success: false, message: verification.reason ?? 'Verification failed' };
  }

  const inviteToken = createInviteToken();
  const tempOwnerId = `pending_${payment.id}`;

  // Atomic: chỉ flip status SUCCESS + tạo Room nếu payment vẫn PENDING.
  // Nếu 2 webhook race, chỉ 1 updateMany hit.
  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, status: 'PENDING' },
    data: { status: 'SUCCESS', paidAt: new Date() },
  });

  if (claimed.count === 0) {
    // Đã có thread khác xử lý xong
    const existing = await prisma.room.findFirst({ where: { paymentId: payment.id } });
    return {
      success: true,
      message: 'Already processed (race)',
      paymentId: payment.id,
      roomId: existing?.id,
    };
  }

  const room = await createRoomService({
    ownerGuestId: tempOwnerId,
    duration: payment.duration,
    maxMembers: payment.maxMembers,
    paymentId: payment.id,
    inviteToken,
  });

  console.log(
    `[payment] webhook OK: payment=${payment.id} amount=${payment.amount} room=${room.id} token=${inviteToken}`
  );

  return { success: true, message: 'OK', paymentId: payment.id, roomId: room.id };
}

/**
 * Cron: đánh dấu payment quá hạn thành EXPIRED.
 */
export async function expirePendingPaymentsService(): Promise<number> {
  const now = new Date();
  const result = await prisma.payment.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now },
    },
    data: { status: 'EXPIRED' },
  });

  if (result.count > 0) {
    console.log(`[payment] expired ${result.count} pending payments`);
  }

  return result.count;
}

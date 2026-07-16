import { NextRequest, NextResponse } from 'next/server';
import { createInvoiceService } from '@/services/payment.service';
import { getOrCreateGuestId } from '@/lib/guest';
import { checkRateLimit } from '@/lib/rateLimit';
import { createPaymentSchema } from '@/lib/validators';
import { TERMS_VERSION } from '@/lib/pricing';

export async function POST(request: NextRequest) {
  try {
    const guestId = getOrCreateGuestId();
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const identifier = `${guestId}:${ip}`;

    const { allowed, resetAt } = await checkRateLimit(identifier, 'payment_create');
    if (!allowed) {
      return NextResponse.json(
        { error: 'Quá nhiều yêu cầu thanh toán. Vui lòng thử lại sau.', retryAfter: resetAt },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = createPaymentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Dữ liệu không hợp lệ', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Verify terms version matches current version
    if (validation.data.termsVersion !== TERMS_VERSION) {
      return NextResponse.json(
        { error: 'Phiên bản Điều khoản không hợp lệ. Vui lòng tải lại trang.' },
        { status: 400 }
      );
    }

    const invoice = await createInvoiceService({
      duration: validation.data.duration,
      maxMembers: validation.data.maxMembers,
      guestId,
      agreedToTerms: validation.data.agreedToTerms,
      agreedAt: new Date(validation.data.agreedAt),
      termsVersion: validation.data.termsVersion,
    });

    return NextResponse.json({
      paymentId: invoice.paymentId,
      amount: invoice.amount,
      qrContent: invoice.qrContent,
      sepayRef: invoice.sepayRef,
      expiresAt: invoice.expiresAt.toISOString(),
      // Khi BYPASS_PAYMENT=true → tạo phòng luôn, frontend redirect thẳng vào
      ...(invoice.roomId && { roomId: invoice.roomId }),
      ...(invoice.inviteToken && { inviteToken: invoice.inviteToken }),
      ...(invoice.status && { status: invoice.status }),
    });
  } catch (error) {
    console.error('Payment create error:', error);
    const message = error instanceof Error ? error.message : 'Không thể tạo thanh toán';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

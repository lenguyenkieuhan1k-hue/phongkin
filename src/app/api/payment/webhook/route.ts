import { NextRequest, NextResponse } from 'next/server';
import { handleWebhookService } from '@/services/payment.service';
import { verifySepaySignature } from '@/lib/sepay';
import type { SepayWebhookPayload } from '@/lib/sepay';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody) as SepayWebhookPayload;

    // Verify HMAC-SHA256 signature
    const secret = process.env.SEPAY_WEBHOOK_SECRET;
    const signature = request.headers.get('x-sepay-signature');
    const timestamp = request.headers.get('x-sepay-timestamp');

    // Nếu có secret → verify bắt buộc
    if (secret) {
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }
      const result = verifySepaySignature(rawBody, signature, secret, timestamp);
      if (!result.valid) {
        console.log('[webhook] signature FAIL:', result.reason);
        return NextResponse.json({ error: result.reason }, { status: 401 });
      }
      console.log('[webhook] signature OK');
    } else {
      console.log('[webhook] no SEPAY_WEBHOOK_SECRET, skipping verification');
    }

    const result = await handleWebhookService(payload);
    if (!result.success) {
      console.log('[webhook] handle FAIL:', result.message);
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    console.log('[webhook] OK:', { paymentId: result.paymentId, roomId: result.roomId });
    return NextResponse.json({
      success: true,
      paymentId: result.paymentId,
      roomId: result.roomId,
    });
  } catch (error) {
    console.error('[webhook] CRASH:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'SePay webhook endpoint. POST a payload to test.',
  });
}

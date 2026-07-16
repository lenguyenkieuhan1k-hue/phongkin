import { NextRequest, NextResponse } from 'next/server';
import { handleWebhookService } from '@/services/payment.service';
import { verifySepaySignature } from '@/lib/sepay';
import type { SepayWebhookPayload } from '@/lib/sepay';

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SepayWebhookPayload;
    console.log('[webhook] POST received:', JSON.stringify(payload));

    // Verify SePay webhook signature
    const apiKey = process.env.SEPAY_API_KEY;
    if (apiKey && apiKey !== 'dev_sandbox_key') {
      const signature = request.headers.get('x-sepay-signature');
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      const rawBody = JSON.stringify(payload);
      if (!verifySepaySignature(rawBody, signature, apiKey)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const result = await handleWebhookService(payload);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      paymentId: result.paymentId,
      roomId: result.roomId,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'SePay webhook endpoint. POST a payload to test.',
  });
}

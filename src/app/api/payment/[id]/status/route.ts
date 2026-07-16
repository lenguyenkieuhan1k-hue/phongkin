import { NextRequest, NextResponse } from 'next/server';
import { getPaymentStatusService } from '@/services/payment.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const status = await getPaymentStatusService(params.id);
    if (!status) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Payment status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

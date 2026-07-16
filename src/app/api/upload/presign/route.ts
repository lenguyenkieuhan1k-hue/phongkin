import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateGuestId } from '@/lib/guest';
import { checkRateLimit } from '@/lib/rateLimit';
import { presignSchema } from '@/lib/validators';
import { generateStorageKey, getPresignedUploadUrl } from '@/lib/storage';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const guestId = getOrCreateGuestId();
    const { allowed } = await checkRateLimit(guestId, 'presign');
    if (!allowed) {
      return NextResponse.json({ error: 'Quá nhiều yêu cầu upload' }, { status: 429 });
    }

    const body = await request.json();
    const validation = presignSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const key = generateStorageKey('file', guestId, validation.data.filename);
    const uploadUrl = await getPresignedUploadUrl(key, 15 * 60);
    const uploadId = crypto.randomUUID();

    return NextResponse.json({
      uploadId,
      key,
      uploadUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Presign error:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}

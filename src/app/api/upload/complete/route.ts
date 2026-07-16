import { NextRequest, NextResponse } from 'next/server';
import { completeUploadSchema } from '@/lib/validators';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = completeUploadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const attachment = await prisma.attachment.create({
      data: {
        messageId: validation.data.attachmentId, // Note: requires valid messageId
        storageKey: validation.data.key,
        mimeType: 'application/octet-stream', // placeholder, real flow would have it
        byteSize: 0,
        checksum: validation.data.checksum,
      },
    });

    return NextResponse.json({ attachmentId: attachment.id });
  } catch (error) {
    console.error('Complete upload error:', error);
    return NextResponse.json({ error: 'Failed to complete upload' }, { status: 500 });
  }
}

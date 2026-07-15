import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionService } from '@/services/session.service';
import { completeUploadService } from '@/services/upload.service';
import { completeUploadSchema } from '@/lib/validators';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('sessionToken')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSessionService(token);

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const validation = completeUploadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const result = await completeUploadService(
      validation.data.key,
      validation.data.attachmentId,
      validation.data.checksum
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      attachmentId: result.attachmentId,
    });
  } catch (error) {
    console.error('Complete upload error:', error);
    return NextResponse.json(
      { error: 'Failed to complete upload' },
      { status: 500 }
    );
  }
}

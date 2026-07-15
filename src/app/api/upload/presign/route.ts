import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionService } from '@/services/session.service';
import { presignUploadService } from '@/services/upload.service';
import { presignSchema } from '@/lib/validators';

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
    const validation = presignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const result = await presignUploadService(
      session.id,
      validation.data.filename,
      validation.data.contentType,
      validation.data.byteSize
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      uploadId: result.uploadId,
      key: result.key,
      uploadUrl: result.uploadUrl,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error('Presign error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAttachmentByStorageKey, getAttachment } from '@/lib/storage-local';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

function resolveFilePath(storageKey: string): string | null {
  // storageKey dạng "/uploads/xxx.ext" → trỏ về public/uploads/xxx.ext
  if (!storageKey || !storageKey.startsWith('/uploads/')) return null;
  const filename = storageKey.slice('/uploads/'.length);
  // Chống path traversal: chỉ cho phép basename
  const safe = path.basename(filename);
  return path.join(UPLOAD_DIR, safe);
}

// GET /api/media/[id] - serve file theo attachment id
// Fallback /api/media/by-key?key=/uploads/xxx - serve theo storageKey (cho thumbnail <img src>)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const meta = getAttachment(id);
    if (!meta) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const filePath = resolveFilePath(meta.storageKey);
    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File missing on disk' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const range = request.headers.get('range');

    // Hỗ trợ Range request để video seek được
    if (range) {
      const match = range.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
        const chunkSize = end - start + 1;
        const stream = fs.createReadStream(filePath, { start, end });

        return new NextResponse(stream as any, {
          status: 206,
          headers: {
            'Content-Type': meta.mimeType,
            'Content-Length': chunkSize.toString(),
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    }

    const stream = fs.createReadStream(filePath);
    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': meta.mimeType,
        'Content-Length': stat.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Media serve error:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}

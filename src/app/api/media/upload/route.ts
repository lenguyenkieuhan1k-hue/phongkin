import { NextRequest, NextResponse } from 'next/server';
import { saveFile, buildAttachmentRecord } from '@/lib/storage-local';

const MAX_IMAGE_SIZE = 25 * 1024 * 1024;  // 25MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_AUDIO_SIZE = 30 * 1024 * 1024;  // 30MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;   // 50MB

const IMAGE_MIMES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'image/svg+xml', 'image/bmp', 'image/x-bmp', 'image/x-ms-bmp',
  'image/tiff', 'image/x-tiff', 'image/heic', 'image/heif', 'image/avif',
  'image/x-icon', 'image/vnd.microsoft.icon', 'image/x-png',
]);

const VIDEO_MIMES = new Set([
  'video/mp4', 'video/mpeg', 'video/webm', 'video/ogg', 'video/quicktime',
  'video/x-msvideo', 'video/x-matroska', 'video/x-m4v',
  'video/3gpp', 'video/3gpp2', 'video/x-flv', 'video/x-ms-wmv',
  'video/x-mpeg', 'video/mp2t', 'video/x-mjpeg', 'video/x-pn-realvideo',
]);

const AUDIO_MIMES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
  'audio/ogg', 'audio/vorbis', 'audio/webm', 'audio/aac', 'audio/x-aac',
  'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/x-flac',
  'audio/x-ms-wma', 'audio/x-ms-wax', 'audio/midi', 'audio/x-midi',
  'audio/basic', 'audio/3gpp', 'audio/3gpp2', 'audio/ac3', 'audio/x-aiff',
]);

const DOC_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
  'application/rtf', 'text/plain', 'text/csv', 'text/html', 'text/markdown',
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  'application/x-tar', 'application/gzip', 'application/json', 'application/xml',
]);

const EXT_MAP: Record<string, { mime: string; kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' }> = {
  jpg: { mime: 'image/jpeg', kind: 'IMAGE' },
  jpeg: { mime: 'image/jpeg', kind: 'IMAGE' },
  jpe: { mime: 'image/jpeg', kind: 'IMAGE' },
  jfif: { mime: 'image/jpeg', kind: 'IMAGE' },
  png: { mime: 'image/png', kind: 'IMAGE' },
  gif: { mime: 'image/gif', kind: 'IMAGE' },
  webp: { mime: 'image/webp', kind: 'IMAGE' },
  svg: { mime: 'image/svg+xml', kind: 'IMAGE' },
  bmp: { mime: 'image/bmp', kind: 'IMAGE' },
  dib: { mime: 'image/bmp', kind: 'IMAGE' },
  tif: { mime: 'image/tiff', kind: 'IMAGE' },
  tiff: { mime: 'image/tiff', kind: 'IMAGE' },
  heic: { mime: 'image/heic', kind: 'IMAGE' },
  heif: { mime: 'image/heif', kind: 'IMAGE' },
  avif: { mime: 'image/avif', kind: 'IMAGE' },
  ico: { mime: 'image/x-icon', kind: 'IMAGE' },
  apng: { mime: 'image/png', kind: 'IMAGE' },
  mp4: { mime: 'video/mp4', kind: 'VIDEO' },
  m4v: { mime: 'video/x-m4v', kind: 'VIDEO' },
  mov: { mime: 'video/quicktime', kind: 'VIDEO' },
  qt: { mime: 'video/quicktime', kind: 'VIDEO' },
  webm: { mime: 'video/webm', kind: 'VIDEO' },
  ogv: { mime: 'video/ogg', kind: 'VIDEO' },
  mkv: { mime: 'video/x-matroska', kind: 'VIDEO' },
  avi: { mime: 'video/x-msvideo', kind: 'VIDEO' },
  wmv: { mime: 'video/x-ms-wmv', kind: 'VIDEO' },
  flv: { mime: 'video/x-flv', kind: 'VIDEO' },
  mpg: { mime: 'video/mpeg', kind: 'VIDEO' },
  mpeg: { mime: 'video/mpeg', kind: 'VIDEO' },
  mpe: { mime: 'video/mpeg', kind: 'VIDEO' },
  mp2: { mime: 'video/mpeg', kind: 'VIDEO' },
  ts: { mime: 'video/mp2t', kind: 'VIDEO' },
  m2ts: { mime: 'video/mp2t', kind: 'VIDEO' },
  mts: { mime: 'video/mp2t', kind: 'VIDEO' },
  '3gp': { mime: 'video/3gpp', kind: 'VIDEO' },
  '3g2': { mime: 'video/3gpp2', kind: 'VIDEO' },
  rm: { mime: 'video/x-pn-realvideo', kind: 'VIDEO' },
  rmvb: { mime: 'video/x-pn-realvideo', kind: 'VIDEO' },
  vob: { mime: 'video/mpeg', kind: 'VIDEO' },
  mp3: { mime: 'audio/mpeg', kind: 'AUDIO' },
  m4a: { mime: 'audio/mp4', kind: 'AUDIO' },
  wav: { mime: 'audio/wav', kind: 'AUDIO' },
  ogg: { mime: 'audio/ogg', kind: 'AUDIO' },
  oga: { mime: 'audio/ogg', kind: 'AUDIO' },
  opus: { mime: 'audio/ogg', kind: 'AUDIO' },
  flac: { mime: 'audio/flac', kind: 'AUDIO' },
  aac: { mime: 'audio/aac', kind: 'AUDIO' },
  wma: { mime: 'audio/x-ms-wma', kind: 'AUDIO' },
  aiff: { mime: 'audio/x-aiff', kind: 'AUDIO' },
  aif: { mime: 'audio/x-aiff', kind: 'AUDIO' },
  mid: { mime: 'audio/midi', kind: 'AUDIO' },
  midi: { mime: 'audio/midi', kind: 'AUDIO' },
  amr: { mime: 'audio/3gpp', kind: 'AUDIO' },
  ac3: { mime: 'audio/ac3', kind: 'AUDIO' },
  pdf: { mime: 'application/pdf', kind: 'FILE' },
  doc: { mime: 'application/msword', kind: 'FILE' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'FILE' },
  xls: { mime: 'application/vnd.ms-excel', kind: 'FILE' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', kind: 'FILE' },
  ppt: { mime: 'application/vnd.ms-powerpoint', kind: 'FILE' },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', kind: 'FILE' },
  rtf: { mime: 'application/rtf', kind: 'FILE' },
  txt: { mime: 'text/plain', kind: 'FILE' },
  csv: { mime: 'text/csv', kind: 'FILE' },
  html: { mime: 'text/html', kind: 'FILE' },
  htm: { mime: 'text/html', kind: 'FILE' },
  md: { mime: 'text/markdown', kind: 'FILE' },
  zip: { mime: 'application/zip', kind: 'FILE' },
  rar: { mime: 'application/x-rar-compressed', kind: 'FILE' },
  '7z': { mime: 'application/x-7z-compressed', kind: 'FILE' },
  tar: { mime: 'application/x-tar', kind: 'FILE' },
  gz: { mime: 'application/gzip', kind: 'FILE' },
  json: { mime: 'application/json', kind: 'FILE' },
  xml: { mime: 'application/xml', kind: 'FILE' },
};

function sniffImage(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';
  if (
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61
  ) return 'image/gif';
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp';
  if (buf[0] === 0x42 && buf[1] === 0x4d) return 'image/bmp';
  if (
    (buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00) ||
    (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a)
  ) return 'image/tiff';
  if (buf.length >= 12 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = buf.slice(8, 12).toString('ascii');
    if (['heic', 'heix', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) return 'image/x-icon';
  return null;
}

function getExt(filename: string): string {
  const m = filename.toLowerCase().match(/\.([^.]+)$/);
  return m ? m[1] : '';
}

function classify(mimeType: string, filename: string, buffer?: Buffer): { type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE'; mime: string; maxSize: number } | null {
  const mime = (mimeType || '').toLowerCase().trim();

  if (mime) {
    if (IMAGE_MIMES.has(mime)) return { type: 'IMAGE', mime, maxSize: MAX_IMAGE_SIZE };
    if (VIDEO_MIMES.has(mime)) return { type: 'VIDEO', mime, maxSize: MAX_VIDEO_SIZE };
    if (AUDIO_MIMES.has(mime)) return { type: 'AUDIO', mime, maxSize: MAX_AUDIO_SIZE };
    if (DOC_MIMES.has(mime)) return { type: 'FILE', mime, maxSize: MAX_FILE_SIZE };
  }

  const ext = getExt(filename);
  if (ext && EXT_MAP[ext]) {
    const info = EXT_MAP[ext];
    const maxSize =
      info.kind === 'IMAGE' ? MAX_IMAGE_SIZE :
      info.kind === 'VIDEO' ? MAX_VIDEO_SIZE :
      info.kind === 'AUDIO' ? MAX_AUDIO_SIZE : MAX_FILE_SIZE;
    return { type: info.kind, mime: info.mime, maxSize };
  }

  if (buffer) {
    const sniffed = sniffImage(buffer);
    if (sniffed) return { type: 'IMAGE', mime: sniffed, maxSize: MAX_IMAGE_SIZE };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Phòng Kín: không cần auth. Lấy guestId từ cookie để làm namespace cho storage.
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const classification = classify(file.type, file.name, buffer);
    if (!classification) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type || 'unknown'} (.${getExt(file.name) || '?'})` },
        { status: 400 }
      );
    }

    if (buffer.length > classification.maxSize) {
      return NextResponse.json(
        { error: `File exceeds ${Math.round(classification.maxSize / 1024 / 1024)}MB limit` },
        { status: 413 }
      );
    }

    const meta = await saveFile(buffer, file.name, classification.mime);

    return NextResponse.json({
      type: classification.type,
      mime: classification.mime,
      attachment: buildAttachmentRecord(meta),
      url: `/api/media/${meta.id}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

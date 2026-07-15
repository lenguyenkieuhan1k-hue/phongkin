// Attachment upload service using R2 (S3-compatible)
// Replaces src/lib/storage-local.ts (which used filesystem).
//
// Used by /api/media/upload (server-side proxy upload).
// Flow:
//   1. Client POSTs file to /api/media/upload
//   2. Server validates MIME + size
//   3. Server uploads buffer to R2
//   4. Server returns attachment metadata (client sends to socket)
//
// To activate: rename this to `storage-r2-service.ts` and update routes.

import crypto from 'crypto';
import { uploadBuffer, generateStorageKey, getPresignedDownloadUrl } from './storage-r2';
import { hashIp } from './auth.prisma';

export interface AttachmentMeta {
  id: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
  filename: string;
  uploadedAt: number;
}

/**
 * Compute SHA256 checksum for integrity verification.
 */
export function computeChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Upload a file buffer to R2 and return the attachment metadata.
 */
export async function saveFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  sessionId: string
): Promise<AttachmentMeta> {
  // Generate storage key (e.g. "image/abc12345/1700000000-a1b2c3d4e5f6.png")
  const type = mimeType.split('/')[0]?.toUpperCase() || 'FILE';
  const key = generateStorageKey(type.toLowerCase(), sessionId, originalName);

  // Upload to R2
  await uploadBuffer(buffer, key, mimeType);

  const meta: AttachmentMeta = {
    id: crypto.randomUUID(),
    storageKey: key,
    mimeType,
    byteSize: buffer.length,
    filename: originalName,
    uploadedAt: Date.now(),
  };

  console.log(`[storage-r2] saved ${meta.id} (${buffer.length} bytes) -> ${key}`);
  return meta;
}

/**
 * Get a presigned URL for downloading an attachment.
 */
export async function getDownloadUrl(storageKey: string): Promise<string> {
  return getPresignedDownloadUrl(storageKey, 60 * 60); // 1 hour
}

export function buildAttachmentRecord(meta: AttachmentMeta): {
  id: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
} {
  return {
    id: meta.id,
    storageKey: meta.storageKey,
    mimeType: meta.mimeType,
    byteSize: meta.byteSize,
  };
}

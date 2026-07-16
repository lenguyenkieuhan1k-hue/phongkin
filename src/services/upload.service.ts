/**
 * Upload service — Presigned URL flow.
 *
 * Phòng Kín không cần session/redis để track uploads.
 * Mỗi upload có TTL 15 phút, sau đó MinIO tự xóa object (nếu bucket có lifecycle rule)
 * hoặc attachment record bị orphan (sẽ cleanup qua cron sau).
 */

import crypto from 'crypto';
import {
  generateStorageKey,
  getPresignedUploadUrl,
} from '@/lib/storage';
import { checkRateLimit } from '@/lib/rateLimit';

interface PresignResult {
  success: true;
  uploadId: string;
  key: string;
  uploadUrl: string;
  expiresAt: string;
}

interface PresignError {
  success: false;
  error: string;
}

export async function presignUploadService(
  guestId: string,
  filename: string,
  contentType: string,
  byteSize: number
): Promise<PresignResult | PresignError> {
  const { allowed } = await checkRateLimit(guestId, 'presign');
  if (!allowed) {
    return { success: false, error: 'Too many upload requests.' };
  }

  // Max size: 200MB (video) - cứng nhắc để tránh presign object lớn
  const MAX_SIZE = 200 * 1024 * 1024;
  if (byteSize > MAX_SIZE) {
    return { success: false, error: 'File too large.' };
  }

  const key = generateStorageKey('file', guestId, filename);
  const uploadUrl = await getPresignedUploadUrl(key, 15 * 60);
  const uploadId = crypto.randomUUID();

  return {
    success: true,
    uploadId,
    key,
    uploadUrl,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

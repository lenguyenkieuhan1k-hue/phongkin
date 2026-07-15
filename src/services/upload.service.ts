import { redis, REDIS_KEYS } from '@/lib/redis';
import {
  generateStorageKey,
  getPresignedUploadUrl,
  headObject,
} from '@/lib/storage';
import {
  validateMimeType,
  getMaxFileSize,
  type ALLOWED_MIME_TYPES,
} from '@/lib/validators';
import prisma from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rateLimit';
import crypto from 'crypto';

interface PresignResult {
  success: true;
  uploadId: string;
  key: string;
  uploadUrl: string;
  expiresAt: Date;
}

interface PresignError {
  success: false;
  error: string;
}

export async function presignUploadService(
  sessionId: string,
  filename: string,
  contentType: string,
  byteSize: number
): Promise<PresignResult | PresignError> {
  // Rate limit check
  const { allowed, resetAt } = await checkRateLimit(sessionId, 'presign');

  if (!allowed) {
    return {
      success: false,
      error: 'Too many upload requests. Please try again later.',
    };
  }

  // Validate MIME type
  const fileType = validateMimeType(contentType);

  if (!fileType) {
    return {
      success: false,
      error: 'File type not allowed.',
    };
  }

  // Validate file size
  const maxSize = getMaxFileSize(fileType);

  if (byteSize > maxSize) {
    return {
      success: false,
      error: `File size exceeds maximum allowed (${Math.round(maxSize / 1024 / 1024)}MB).`,
    };
  }

  // Generate storage key
  const key = generateStorageKey(fileType, sessionId, filename);

  // Generate presigned URL
  const uploadUrl = await getPresignedUploadUrl(key, 15 * 60); // 15 minutes

  // Generate upload ID
  const uploadId = crypto.randomUUID();

  // Store upload metadata in Redis
  await redis.set(
    `upload:${uploadId}`,
    JSON.stringify({
      key,
      sessionId,
      contentType,
      byteSize,
      status: 'pending',
      createdAt: Date.now(),
    }),
    'EX',
    15 * 60 // 15 minutes
  );

  return {
    success: true,
    uploadId,
    key,
    uploadUrl,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  };
}

interface CompleteUploadResult {
  success: true;
  attachmentId: string;
}

interface CompleteUploadError {
  success: false;
  error: string;
}

export async function completeUploadService(
  uploadId: string,
  messageId: string,
  providedChecksum?: string
): Promise<CompleteUploadResult | CompleteUploadError> {
  // Get upload metadata
  const uploadData = await redis.get(`upload:${uploadId}`);

  if (!uploadData) {
    return {
      success: false,
      error: 'Upload not found or expired.',
    };
  }

  const metadata = JSON.parse(uploadData);

  if (metadata.status !== 'pending') {
    return {
      success: false,
      error: 'Upload already completed.',
    };
  }

  // Verify the object exists in storage
  const stat = await headObject(metadata.key);

  if (!stat) {
    return {
      success: false,
      error: 'File not found in storage.',
    };
  }

  // Verify size
  if (stat.size !== metadata.byteSize) {
    return {
      success: false,
      error: 'File size mismatch.',
    };
  }

  // Calculate checksum if provided
  // In production, you would verify against client-provided checksum
  const checksum = providedChecksum || crypto.randomUUID();

  try {
    // Create attachment record
    const attachment = await prisma.attachment.create({
      data: {
        messageId,
        storageKey: metadata.key,
        mimeType: metadata.contentType,
        byteSize: stat.size,
        checksum,
      },
    });

    // Update upload status
    await redis.set(
      `upload:${uploadId}`,
      JSON.stringify({
        ...metadata,
        status: 'completed',
        attachmentId: attachment.id,
        completedAt: Date.now(),
      }),
      'EX',
      60 * 60 // Keep for 1 hour for debugging
    );

    return {
      success: true,
      attachmentId: attachment.id,
    };
  } catch (error) {
    console.error('Failed to create attachment:', error);
    return {
      success: false,
      error: 'Failed to save attachment metadata.',
    };
  }
}

export async function getAttachmentService(attachmentId: string) {
  return prisma.attachment.findUnique({
    where: { id: attachmentId },
  });
}

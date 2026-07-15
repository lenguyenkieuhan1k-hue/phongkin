import { z } from 'zod';

export const DARK_ID_REGEX = /^DT-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export const createSessionSchema = z.object({});

export const inviteSchema = z.object({
  targetDarkId: z.string().regex(DARK_ID_REGEX, 'Invalid Dark ID format'),
});

export const messageSchema = z.object({
  roomId: z.string().uuid(),
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'FILE', 'VOICE', 'SYSTEM']),
  body: z.string().max(4000).optional(),
  attachmentId: z.string().uuid().optional(),
});

export const presignSchema = z.object({
  filename: z.string().max(255),
  contentType: z.string(),
  byteSize: z.number().int().positive(),
});

export const completeUploadSchema = z.object({
  key: z.string(),
  attachmentId: z.string().uuid(),
  checksum: z.string().length(64),
});

export const roomIdSchema = z.object({
  id: z.string().uuid(),
});

export const messageIdSchema = z.object({
  id: z.string().uuid(),
});

// Allowed MIME types by category
export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm'],
  voice: ['audio/mp3', 'audio/ogg', 'audio/webm', 'audio/mpeg'],
  file: ['application/pdf', 'application/zip', 'application/x-rar-compressed'],
} as const;

// Max file sizes in bytes
export const MAX_FILE_SIZES = {
  image: 20 * 1024 * 1024, // 20 MB
  video: 100 * 1024 * 1024, // 100 MB
  voice: 30 * 1024 * 1024, // 30 MB
  file: 100 * 1024 * 1024, // 100 MB
} as const;

export function validateMimeType(
  mimeType: string
): 'image' | 'video' | 'voice' | 'file' | null {
  if (ALLOWED_MIME_TYPES.image.includes(mimeType as any)) return 'image';
  if (ALLOWED_MIME_TYPES.video.includes(mimeType as any)) return 'video';
  if (ALLOWED_MIME_TYPES.voice.includes(mimeType as any)) return 'voice';
  if (ALLOWED_MIME_TYPES.file.includes(mimeType as any)) return 'file';
  return null;
}

export function getMaxFileSize(type: 'image' | 'video' | 'voice' | 'file'): number {
  return MAX_FILE_SIZES[type];
}

export function sanitizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

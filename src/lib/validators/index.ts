import { z } from 'zod';

export const INVITE_TOKEN_REGEX = /^[A-Za-z0-9]{16,24}$/;

export const createPaymentSchema = z.object({
  duration: z.union([z.literal(10), z.literal(30), z.literal(60), z.literal(120)]),
  maxMembers: z.union([z.literal(2), z.literal(5), z.literal(10), z.literal(20)]),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'Bạn phải đồng ý với Điều khoản sử dụng để tiếp tục.' }),
  }),
  agreedAt: z.string().datetime({ message: 'Invalid timestamp' }),
  termsVersion: z.string().min(1),
});

export const messageSchema = z.object({
  roomId: z.string().uuid(),
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'FILE', 'VOICE', 'SYSTEM']),
  body: z.string().max(4000).optional(),
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

// Sanitize text body
export function sanitizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

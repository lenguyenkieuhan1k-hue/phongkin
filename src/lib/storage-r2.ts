// Cloudflare R2 storage - S3-compatible API
// Drop-in replacement for src/lib/storage.ts (was MinIO)
//
// R2 is free 10GB storage vĩnh viễn + zero egress fees.
// Uses AWS SDK v3 with a custom endpoint.
//
// Env vars required:
//   R2_ACCOUNT_ID         - Cloudflare account ID
//   R2_ACCESS_KEY_ID      - R2 API token
//   R2_SECRET_ACCESS_KEY  - R2 API token secret
//   R2_BUCKET             - bucket name (e.g. darktalk-uploads)
//   R2_PUBLIC_URL         - public bucket URL (optional, for public read)

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// ---------------- Client (singleton) ----------------

let _client: S3Client | null = null;
let _bucket: string | null = null;

export function getR2Client(): S3Client {
  if (_client) return _client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 not configured: missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY'
    );
  }

  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return _client;
}

export function getBucket(): string {
  if (_bucket) return _bucket;
  _bucket = process.env.R2_BUCKET || 'darktalk-uploads';
  return _bucket;
}

// ---------------- Presigned URLs ----------------

/**
 * Generate a presigned URL for client to PUT file directly to R2.
 * Returned URL is valid for 15 minutes.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiry: number = 15 * 60
): Promise<string> {
  const client = getR2Client();
  const bucket = getBucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn: expiry });
}

/**
 * Generate a presigned GET URL. Default 1h expiry.
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiry: number = 60 * 60
): Promise<string> {
  const client = getR2Client();
  const bucket = getBucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiry });
}

// ---------------- Object operations ----------------

export interface ObjectStat {
  size: number;
  contentType?: string;
  metadata: Record<string, string>;
}

export async function headObject(key: string): Promise<ObjectStat | null> {
  try {
    const client = getR2Client();
    const bucket = getBucket();

    const response = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key })
    );
    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType,
      metadata: response.Metadata || {},
    };
  } catch (err: any) {
    if (err?.name === 'NotFound') return null;
    throw err;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const client = getR2Client();
  const bucket = getBucket();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// ---------------- Storage keys ----------------

/**
 * Generate a unique storage key for a file.
 * Pattern: {type}/{sessionIdShort}/{timestamp}-{randomId}.{ext}
 *
 * Example: image/abc123/1700000000-xyz.png
 */
export function generateStorageKey(
  type: string,
  sessionId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const ext = (filename.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const randomId = crypto.randomBytes(6).toString('hex');
  const sessionShort = sessionId.substring(0, 8);
  return `${type}/${sessionShort}/${timestamp}-${randomId}${ext ? '.' + ext : ''}`;
}

// ---------------- Server-side upload (for proxy uploads) ----------------

/**
 * Server-side upload (used when client sends file via POST /api/media/upload).
 * Returns the storage key + metadata.
 */
export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ key: string; size: number }> {
  const client = getR2Client();
  const bucket = getBucket();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return { key, size: buffer.length };
}

// ---------------- Public URL helper ----------------

/**
 * Get a publicly-accessible URL for an object (works only if bucket has public access enabled).
 * For private buckets, use getPresignedDownloadUrl() instead.
 */
export function getPublicUrl(key: string): string {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, '')}/${key}`;
  }
  const accountId = process.env.R2_ACCOUNT_ID;
  if (accountId) {
    return `https://${getBucket()}.${accountId}.r2.cloudflarestorage.com/${key}`;
  }
  throw new Error('R2_PUBLIC_URL or R2_ACCOUNT_ID not configured');
}

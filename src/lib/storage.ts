import * as Minio from 'minio';

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'darktalk';

export async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME);
    await minioClient.setBucketPolicy(
      BUCKET_NAME,
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicRead',
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
          },
        ],
      })
    );
  }
}

export function getPresignedUploadUrl(
  key: string,
  expiry: number = 15 * 60
): Promise<string> {
  return minioClient.presignedPutObject(BUCKET_NAME, key, expiry);
}

export function getPresignedDownloadUrl(
  key: string,
  expiry: number = 60 * 60
): Promise<string> {
  return minioClient.presignedGetObject(BUCKET_NAME, key, expiry);
}

export async function headObject(
  key: string
): Promise<{ size: number; metaData: Record<string, string> } | null> {
  try {
    return await minioClient.statObject(BUCKET_NAME, key);
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  await minioClient.removeObject(BUCKET_NAME, key);
}

export function generateStorageKey(
  type: string,
  sessionId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const ext = filename.split('.').pop() || '';
  const randomId = Math.random().toString(36).substring(2, 15);
  return `${type}/${sessionId}/${timestamp}-${randomId}${ext ? '.' + ext : ''}`;
}

export { minioClient, BUCKET_NAME };

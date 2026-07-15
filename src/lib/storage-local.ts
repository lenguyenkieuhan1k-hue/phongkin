import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface AttachmentMeta {
  id: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
  filename: string;
  uploadedAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __darktalkAttachments: Map<string, AttachmentMeta> | undefined;
}

function getStore(): Map<string, AttachmentMeta> {
  if (!globalThis.__darktalkAttachments) {
    globalThis.__darktalkAttachments = new Map();
  }
  return globalThis.__darktalkAttachments;
}

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export async function saveFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<AttachmentMeta> {
  ensureUploadDir();

  const ext = path.extname(originalName) || '';
  const id = crypto.randomUUID();
  const filename = `${id}${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  await fs.promises.writeFile(filePath, buffer);

  const meta: AttachmentMeta = {
    id,
    storageKey: `/uploads/${filename}`,
    mimeType,
    byteSize: buffer.length,
    filename: originalName,
    uploadedAt: Date.now(),
  };

  getStore().set(id, meta);
  console.log(`[storage] saved file ${id} (${buffer.length} bytes) -> ${meta.storageKey}`);

  return meta;
}

export function getAttachment(id: string): AttachmentMeta | undefined {
  return getStore().get(id);
}

export function getAttachmentByStorageKey(storageKey: string): AttachmentMeta | undefined {
  for (const meta of getStore().values()) {
    if (meta.storageKey === storageKey) return meta;
  }
  return undefined;
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
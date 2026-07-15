// Session types
export interface Session {
  id: string;
  token: string;
  darkId: string;
  handle: string;
  ipHash: string;
  expiresAt: Date;
  createdAt: Date;
}

// Room types
export interface Room {
  id: string;
  darkIdA: string;
  darkIdB: string | null;
  status: RoomStatus;
  createdAt: Date;
  expiresAt: Date;
}

export enum RoomStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

// Message types
export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  type: MessageType;
  body?: string;
  recalledAt?: Date | null;
  createdAt: Date;
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  FILE = 'FILE',
  VOICE = 'VOICE',
  SYSTEM = 'SYSTEM',
}

// Attachment types
export interface Attachment {
  id: string;
  messageId: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  durationMs?: number;
  checksum: string;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Socket event types
export interface ServerToClientEvents {
  'auth:success': (data: { darkId: string; handle: string }) => void;
  'auth:fail': (data: { error: string }) => void;
  'room:created': (data: { roomId: string; status: string }) => void;
  'room:joined': (data: { roomId: string; messages: Message[]; room: Room }) => void;
  'room:left': (data: { roomId: string }) => void;
  'room:invite': (data: { roomId: string; fromDarkId: string }) => void;
  'room:accepted': (data: { roomId: string }) => void;
  'room:rejected': (data: { roomId: string }) => void;
  'message:new': (data: Message) => void;
  'message:recalled': (data: { messageId: string }) => void;
  'message:deleted': (data: { messageId: string }) => void;
  'message:read': (data: { roomId: string; messageId: string }) => void;
  'typing:update': (data: { roomId: string; darkId: string; isTyping: boolean }) => void;
  'presence:update': (data: { darkId: string; status: 'online' | 'offline' }) => void;
  'error': (data: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  'auth': (data: { token: string }) => void;
  'room:join': (data: { roomId: string }) => void;
  'room:leave': (data: { roomId: string }) => void;
  'message:send': (data: { roomId: string; type: string; body?: string; attachmentId?: string }) => void;
  'message:recall': (data: { messageId: string }) => void;
  'message:delete': (data: { messageId: string }) => void;
  'typing:start': (data: { roomId: string }) => void;
  'typing:stop': (data: { roomId: string }) => void;
  'presence:heartbeat': () => void;
}

// Shared state for Report Room - imported by route handlers

export interface ReportMessage {
  id: string;
  roomId: string;
  senderGuestId: string;
  senderHandle: string;
  type: string;
  body?: string;
  attachments?: unknown[];
  createdAt: string;
}

export const reportMessages: ReportMessage[] = [];

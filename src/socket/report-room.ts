// Shared state for Report Room
// This file is imported by multiple modules to avoid circular dependencies

// Messages for report room (in-memory)
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

export const REPORT_ROOM_ID = 'REPORT_ROOM';

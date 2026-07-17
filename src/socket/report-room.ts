// Shared state for Report Room
// This file is imported by multiple modules to avoid circular dependencies

// GuestId -> Handle mapping for report room
export const reportRoomHandles = new Map<string, string>();

// GuestId -> join info for report room (used in auth)
export const reportRoomGuests = new Map<string, { handle: string; joinedAt: Date }>();

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

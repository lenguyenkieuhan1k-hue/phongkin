'use client';

import { create } from 'zustand';

interface RoomState {
  currentRoomId: string | null;
  inviteToken: string | null;
  guestId: string | null;
  memberCount: number;
  maxMembers: number;
  members: Array<{ guestId: string; handle: string; isOwner: boolean }>;
  expiresAt: string | null;
  roomStatus: 'ACTIVE' | 'FULL' | 'EXPIRED' | null;
  setRoom: (info: {
    roomId: string;
    inviteToken: string;
    guestId: string;
    maxMembers: number;
    members?: Array<{ guestId: string; handle: string; isOwner: boolean }>;
    expiresAt: string;
    status: 'ACTIVE' | 'FULL' | 'EXPIRED';
  }) => void;
  setMemberCount: (n: number) => void;
  setRoomStatus: (s: 'ACTIVE' | 'FULL' | 'EXPIRED') => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  currentRoomId: null,
  inviteToken: null,
  guestId: null,
  memberCount: 1,
  maxMembers: 0,
  members: [],
  expiresAt: null,
  roomStatus: null,
  setRoom: (info) =>
    set({
      currentRoomId: info.roomId,
      inviteToken: info.inviteToken,
      guestId: info.guestId,
      maxMembers: info.maxMembers,
      members: info.members ?? [],
      expiresAt: info.expiresAt,
      roomStatus: info.status,
      memberCount: 1,
    }),
  setMemberCount: (n) => set({ memberCount: n }),
  setRoomStatus: (s) => set({ roomStatus: s }),
  clearRoom: () =>
    set({
      currentRoomId: null,
      inviteToken: null,
      guestId: null,
      memberCount: 0,
      maxMembers: 0,
      members: [],
      expiresAt: null,
      roomStatus: null,
    }),
}));

interface Message {
  id: string;
  roomId: string;
  senderGuestId: string;
  senderHandle: string;
  type: string;
  body?: string;
  attachments?: Array<{
    id: string;
    storageKey: string;
    mimeType: string;
    byteSize: number;
  }>;
  createdAt: string;
  recalledAt?: string | null;
}

interface MessageState {
  messages: Message[];
  typingUsers: string[];
  addMessage: (m: Message) => void;
  setMessages: (msgs: Message[]) => void;
  updateMessage: (id: string, patch: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  setTyping: (guestIds: string[]) => void;
  clear: () => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: [],
  typingUsers: [],
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setMessages: (msgs) => set({ messages: msgs }),
  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  removeMessage: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
  setTyping: (guestIds) => set({ typingUsers: guestIds }),
  clear: () => set({ messages: [], typingUsers: [] }),
}));

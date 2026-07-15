'use client';

import { create } from 'zustand';
import { Session } from '@prisma/client';

interface SessionState {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  isLoading: false,
  error: null,
  setSession: (session) => set({ session, isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
}));

interface RoomState {
  currentRoomId: string | null;
  rooms: Map<string, RoomInfo>;
  setCurrentRoom: (roomId: string | null) => void;
  addRoom: (roomId: string, info: RoomInfo) => void;
  removeRoom: (roomId: string) => void;
}

interface RoomInfo {
  id: string;
  status: string;
  otherUserDarkId: string;
}

export const useRoomStore = create<RoomState>((set) => ({
  currentRoomId: null,
  rooms: new Map(),
  setCurrentRoom: (roomId) => set({ currentRoomId: roomId }),
  addRoom: (roomId, info) =>
    set((state) => {
      const newRooms = new Map(state.rooms);
      newRooms.set(roomId, info);
      return { rooms: newRooms };
    }),
  removeRoom: (roomId) =>
    set((state) => {
      const newRooms = new Map(state.rooms);
      newRooms.delete(roomId);
      return { rooms: newRooms };
    }),
}));

interface Message {
  id: string;
  roomId: string;
  senderId: string;
  sender?: {
    id: string;
    darkId: string;
    handle: string;
  };
  type: string;
  body?: string;
  attachments?: Attachment[];
  createdAt: string;
  recalledAt?: string | null;
}

interface Attachment {
  id: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
}

interface MessageState {
  messages: Map<string, Message[]>;
  typingUsers: Map<string, string[]>;
  addMessage: (roomId: string, message: Message) => void;
  updateMessage: (roomId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (roomId: string, messageId: string) => void;
  setMessages: (roomId: string, messages: Message[]) => void;
  setTypingUsers: (roomId: string, users: string[]) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: new Map(),
  typingUsers: new Map(),
  addMessage: (roomId, message) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      const roomMessages = newMessages.get(roomId) || [];
      roomMessages.push(message);
      newMessages.set(roomId, roomMessages);
      return { messages: newMessages };
    }),
  updateMessage: (roomId, messageId, updates) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      const roomMessages = newMessages.get(roomId) || [];
      const index = roomMessages.findIndex((m) => m.id === messageId);
      if (index !== -1) {
        roomMessages[index] = { ...roomMessages[index], ...updates };
        newMessages.set(roomId, roomMessages);
      }
      return { messages: newMessages };
    }),
  removeMessage: (roomId, messageId) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      const roomMessages = newMessages.get(roomId) || [];
      newMessages.set(
        roomId,
        roomMessages.filter((m) => m.id !== messageId)
      );
      return { messages: newMessages };
    }),
  setMessages: (roomId, messages) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      newMessages.set(roomId, messages);
      return { messages: newMessages };
    }),
  setTypingUsers: (roomId, users) =>
    set((state) => {
      const newTyping = new Map(state.typingUsers);
      newTyping.set(roomId, users);
      return { typingUsers: newTyping };
    }),
}));

interface PresenceState {
  onlineUsers: Set<string>;
  setOnline: (darkId: string) => void;
  setOffline: (darkId: string) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUsers: new Set(),
  setOnline: (darkId) =>
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      newSet.add(darkId);
      return { onlineUsers: newSet };
    }),
  setOffline: (darkId) =>
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      newSet.delete(darkId);
      return { onlineUsers: newSet };
    }),
}));

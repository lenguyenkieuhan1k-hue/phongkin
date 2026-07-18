/**
 * Socket.IO event constants cho Phòng Kín.
 * Bỏ các event Dark ID / invite, thêm event phòng chat.
 */

export const SOCKET_EVENTS = {
  // Client -> Server
  AUTH: 'auth',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  MESSAGE_SEND: 'message:send',
  MESSAGE_RECALL: 'message:recall',
  MESSAGE_DELETE: 'message:delete',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  PRESENCE_HEARTBEAT: 'presence:heartbeat',

  // Voice call — Client -> Server
  VOICE_CALL_OFFER: 'voice:call:offer',
  VOICE_CALL_ANSWER: 'voice:call:answer',
  VOICE_CALL_ICE: 'voice:call:ice',
  VOICE_CALL_ACCEPT: 'voice:call:accept',
  VOICE_CALL_REJECT: 'voice:call:reject',
  VOICE_CALL_END: 'voice:call:end',
  VOICE_CALL_BUSY: 'voice:call:busy',

  // Server -> Client
  AUTH_SUCCESS: 'auth:success',
  AUTH_FAIL: 'auth:fail',
  ROOM_JOINED: 'room:joined',
  ROOM_LEFT: 'room:left',
  ROOM_MEMBER_JOINED: 'room:member-joined',
  ROOM_MEMBER_LEFT: 'room:member-left',
  ROOM_CLOSED: 'room:closed',
  MESSAGE_NEW: 'message:new',
  MESSAGE_RECALLED: 'message:recalled',
  MESSAGE_DELETED: 'message:deleted',
  TYPING_UPDATE: 'typing:update',
  PRESENCE_UPDATE: 'presence:update',
  ERROR: 'error',
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

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

  // Server -> Client
  AUTH_SUCCESS: 'auth:success',
  AUTH_FAIL: 'auth:fail',
  ROOM_CREATED: 'room:created',
  ROOM_JOINED: 'room:joined',
  ROOM_LEFT: 'room:left',
  ROOM_INVITE: 'room:invite',
  ROOM_ACCEPTED: 'room:accepted',
  ROOM_REJECTED: 'room:rejected',
  MESSAGE_NEW: 'message:new',
  MESSAGE_RECALLED: 'message:recalled',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_READ: 'message:read',
  TYPING_UPDATE: 'typing:update',
  PRESENCE_UPDATE: 'presence:update',
  ERROR: 'error',
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

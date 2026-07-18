import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { SOCKET_EVENTS } from '../events';

// roomId -> active call info
const activeCalls = new Map<string, { callerId: string; callerSocketId: string; calleeId: string; calleeSocketId: string }>();

export function handleVoiceCallEvents(io: SocketIOServer, socket: AuthenticatedSocket): void {
  const { roomId, guestId, handle } = socket;
  if (!roomId || !guestId) return;

  // OFFER: caller sends WebRTC offer (SDP) + target guestId
  socket.on(SOCKET_EVENTS.VOICE_CALL_OFFER, ({ targetGuestId, offer }: { targetGuestId: string; offer: RTCSessionDescriptionInit }) => {
    if (activeCalls.has(roomId)) {
      socket.emit(SOCKET_EVENTS.VOICE_CALL_BUSY, { reason: 'call_in_progress' });
      return;
    }

    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    if (!roomSockets) return;

    let targetSocketId: string | null = null;
    for (const sid of roomSockets) {
      const s = io.sockets.sockets.get(sid);
      if (s && (s as AuthenticatedSocket).guestId === targetGuestId) {
        targetSocketId = sid;
        break;
      }
    }

    if (!targetSocketId) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'USER_NOT_FOUND', message: 'Người dùng không online' });
      return;
    }

    activeCalls.set(roomId, {
      callerId: guestId,
      callerSocketId: socket.id,
      calleeId: targetGuestId,
      calleeSocketId: targetSocketId,
    });

    // Relay offer SDP to callee
    const targetSocket = io.sockets.sockets.get(targetSocketId) as AuthenticatedSocket;
    if (targetSocket) {
      targetSocket.emit(SOCKET_EVENTS.VOICE_CALL_OFFER, {
        callerId: guestId,
        callerName: handle,
        callerSocketId: socket.id,
        offer,
      });
    }
  });

  // ICE candidate relay
  socket.on(SOCKET_EVENTS.VOICE_CALL_ICE, ({ targetSocketId, candidate }: { targetSocketId: string; candidate: RTCIceCandidateInit }) => {
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.emit(SOCKET_EVENTS.VOICE_CALL_ICE, { socketId: socket.id, candidate });
    }
  });

  // ANSWER: callee sends WebRTC answer (SDP)
  socket.on(SOCKET_EVENTS.VOICE_CALL_ANSWER, ({ targetSocketId, answer }: { targetSocketId: string; answer: RTCSessionDescriptionInit }) => {
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.emit(SOCKET_EVENTS.VOICE_CALL_ANSWER, { socketId: socket.id, answer });
    }
  });

  // REJECT: callee declines
  socket.on(SOCKET_EVENTS.VOICE_CALL_REJECT, ({ targetSocketId }: { targetSocketId: string }) => {
    activeCalls.delete(roomId);
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.emit(SOCKET_EVENTS.VOICE_CALL_REJECT, { socketId: socket.id });
    }
  });

  // END: either party ends the call
  socket.on(SOCKET_EVENTS.VOICE_CALL_END, () => {
    const call = activeCalls.get(roomId);
    if (!call) return;
    activeCalls.delete(roomId);

    const otherSocketId = call.callerSocketId === socket.id ? call.calleeSocketId : call.callerSocketId;
    const otherSocket = io.sockets.sockets.get(otherSocketId);
    if (otherSocket) {
      otherSocket.emit(SOCKET_EVENTS.VOICE_CALL_END, { socketId: socket.id });
    }
  });

  socket.on('disconnect', () => {
    const call = activeCalls.get(roomId);
    if (call && (call.callerSocketId === socket.id || call.calleeSocketId === socket.id)) {
      activeCalls.delete(roomId);
      const otherSocketId = call.callerSocketId === socket.id ? call.calleeSocketId : call.callerSocketId;
      const otherSocket = io.sockets.sockets.get(otherSocketId);
      if (otherSocket) {
        otherSocket.emit(SOCKET_EVENTS.VOICE_CALL_END, { socketId: socket.id });
      }
    }
  });
}

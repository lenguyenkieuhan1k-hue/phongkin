'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useVoiceCallStore } from './useStore';
import { SOCKET_EVENTS } from '@/socket/events';

let socket: Socket | null = null;

export function setVoiceSocket(s: Socket | null) {
  socket = s;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useVoiceCall() {
  const { status, peerId, peerName, callerId, callerSocketId, setVoiceCall, resetVoiceCall } = useVoiceCallStore();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      return stream;
    } catch {
      return null;
    }
  }, []);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
  }, []);

  const doEndCall = useCallback(() => {
    cleanup();
    setVoiceCall({ status: 'ended' });
    setTimeout(() => resetVoiceCall(), 1500);
  }, [cleanup, setVoiceCall, resetVoiceCall]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setVoiceCall({ isMuted: !track.enabled });
      }
    }
  }, [setVoiceCall]);

  // ─── CALLER: start call ───────────────────────────────────────
  const startCall = useCallback(async (targetGuestId: string) => {
    if (!socket) return;
    cleanup();

    setVoiceCall({ status: 'calling', peerId: targetGuestId, callerSocketId: null, isConnecting: true });

    const stream = await getLocalStream();
    if (!stream) { resetVoiceCall(); return; }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit(SOCKET_EVENTS.VOICE_CALL_ICE, {
          targetSocketId: useVoiceCallStore.getState().callerSocketId ?? '',
          candidate,
        });
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit(SOCKET_EVENTS.VOICE_CALL_OFFER, { targetGuestId, offer: pc.localDescription });
    } catch {
      resetVoiceCall();
    }
  }, [socket, cleanup, getLocalStream, setVoiceCall, resetVoiceCall]);

  // ─── CALLEE: handle incoming offer ───────────────────────────
  const handleIncomingOffer = useCallback(async (
    callerSocketIdVal: string,
    callerIdVal: string,
    callerName: string,
    offer: RTCSessionDescriptionInit
  ) => {
    if (!socket) return;
    cleanup();

    setVoiceCall({
      status: 'ringing',
      peerId: callerIdVal,
      peerName: callerName,
      callerId: callerIdVal,
      callerSocketId: callerSocketIdVal,
      isConnecting: true,
    });

    const stream = await getLocalStream();
    if (!stream) { resetVoiceCall(); return; }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit(SOCKET_EVENTS.VOICE_CALL_ICE, {
          targetSocketId: callerSocketIdVal,
          candidate,
        });
      }
    };

    pc.ontrack = () => {
      setVoiceCall({ status: 'connected', isConnecting: false, callStartedAt: Date.now() });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        doEndCall();
      }
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit(SOCKET_EVENTS.VOICE_CALL_ANSWER, { targetSocketId: callerSocketIdVal, answer: pc.localDescription });
    } catch {
      resetVoiceCall();
    }
  }, [socket, cleanup, getLocalStream, setVoiceCall, resetVoiceCall, doEndCall]);

  // ─── CALLER: handle incoming answer ─────────────────────────
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!pcRef.current) return;
    try {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      setVoiceCall({ status: 'connected', isConnecting: false, callStartedAt: Date.now() });
    } catch { /* ignore */ }
  }, [setVoiceCall]);

  // ─── HANDLE ICE from peer ───────────────────────────────────
  const handleIce = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!pcRef.current) return;
    try {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch { /* ignore */ }
  }, []);

  // ─── REJECT ─────────────────────────────────────────────────
  const rejectCall = useCallback((targetSocketId: string) => {
    if (socket) socket.emit(SOCKET_EVENTS.VOICE_CALL_REJECT, { targetSocketId });
    cleanup();
    resetVoiceCall();
  }, [socket, cleanup, resetVoiceCall]);

  // ─── END ────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (socket) socket.emit(SOCKET_EVENTS.VOICE_CALL_END);
    doEndCall();
  }, [socket, doEndCall]);

  // ─── Socket listeners ───────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onOffer = (data: { callerId: string; callerName: string; callerSocketId: string; offer: RTCSessionDescriptionInit }) => {
      handleIncomingOffer(data.callerSocketId, data.callerId, data.callerName, data.offer);
    };
    const onAnswer = (data: { answer: RTCSessionDescriptionInit }) => handleAnswer(data.answer);
    const onIce = (data: { candidate: RTCIceCandidateInit }) => handleIce(data.candidate);
    const onReject = () => { cleanup(); resetVoiceCall(); };
    const onEnd = () => doEndCall();
    const onBusy = () => { cleanup(); resetVoiceCall(); };

    socket.on(SOCKET_EVENTS.VOICE_CALL_OFFER, onOffer);
    socket.on(SOCKET_EVENTS.VOICE_CALL_ANSWER, onAnswer);
    socket.on(SOCKET_EVENTS.VOICE_CALL_ICE, onIce);
    socket.on(SOCKET_EVENTS.VOICE_CALL_REJECT, onReject);
    socket.on(SOCKET_EVENTS.VOICE_CALL_END, onEnd);
    socket.on(SOCKET_EVENTS.VOICE_CALL_BUSY, onBusy);

    return () => {
      socket!.off(SOCKET_EVENTS.VOICE_CALL_OFFER, onOffer);
      socket!.off(SOCKET_EVENTS.VOICE_CALL_ANSWER, onAnswer);
      socket!.off(SOCKET_EVENTS.VOICE_CALL_ICE, onIce);
      socket!.off(SOCKET_EVENTS.VOICE_CALL_REJECT, onReject);
      socket!.off(SOCKET_EVENTS.VOICE_CALL_END, onEnd);
      socket!.off(SOCKET_EVENTS.VOICE_CALL_BUSY, onBusy);
    };
  }, [socket, handleIncomingOffer, handleAnswer, handleIce, cleanup, resetVoiceCall, doEndCall]);

  return { status, peerId, peerName, callerId, startCall, rejectCall, endCall, toggleMute };
}

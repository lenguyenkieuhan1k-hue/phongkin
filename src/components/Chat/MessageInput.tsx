'use client';

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';

interface MessageInputProps {}

interface AttachmentResult {
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
  attachment: {
    id: string;
    storageKey: string;
    mimeType: string;
    byteSize: number;
  };
  url: string;
}

interface PendingAttachment {
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'VOICE';
  url?: string;
  mimeType: string;
  filename: string;
  byteSize: number;
  attachmentId: string;
  storageKey: string;
  durationSec?: number;
}

const MAX_VOICE_SECONDS = 5 * 60; // 5 phút

export default function MessageInput({}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [cancelHint, setCancelHint] = useState<'hold' | 'cancel' | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  // Pointer drag tracking — cần dùng ref để truy cập trong event listener mà không cần re-attach
  const dragStateRef = useRef<{ active: boolean; startX: number; startY: number; cancelled: boolean }>({
    active: false,
    startX: 0,
    startY: 0,
    cancelled: false,
  });

  useEffect(() => {
    const handleRecall = (e: CustomEvent<{ messageId: string }>) => {
      // Đọc socket trực tiếp từ window mỗi lần — tránh race với useSocket hook
      const sock = (window as any).__socket;
      sock?.emit('message:recall', { messageId: e.detail.messageId });
    };
    window.addEventListener('phongkin-recall', handleRecall as EventListener);
    return () => window.removeEventListener('phongkin-recall', handleRecall as EventListener);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
    if (!isTyping) {
      setIsTyping(true);
      (window as any).__socket?.emit('typing:start');
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      (window as any).__socket?.emit('typing:stop');
    }, 2000);
  };

  const handleFiles = async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data: AttachmentResult | { error: string } = await res.json();
      if (!res.ok || 'error' in data) {
        const err = 'error' in data ? data.error : 'Upload failed';
        setUploadError(err);
        return;
      }

      setPendingAttachment({
        type: data.type,
        url: data.url,
        mimeType: data.attachment.mimeType,
        filename: file.name,
        byteSize: data.attachment.byteSize,
        attachmentId: data.attachment.id,
        storageKey: data.attachment.storageKey,
      });
    } catch (err) {
      setUploadError('Upload thất bại');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if ((!trimmed && !pendingAttachment) || isSending || isUploading) return;

    setIsSending(true);
    setMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTyping) {
      setIsTyping(false);
      (window as any).__socket?.emit('typing:stop');
    }

    // VOICE là loại riêng — type gửi đi là VOICE (không phải AUDIO)
    // để renderer dùng Messenger-style bubble thay vì <audio> native
    let type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'VOICE' = 'TEXT';
    let attachmentMeta: any;

    if (pendingAttachment) {
      type = pendingAttachment.type as any;
      attachmentMeta = {
        storageKey: pendingAttachment.storageKey,
        mimeType: pendingAttachment.mimeType,
        byteSize: pendingAttachment.byteSize,
        id: pendingAttachment.attachmentId,
      };
    }

    (window as any).__socket?.emit('message:send', {
      type,
      body: trimmed || undefined,
      attachmentMeta,
    });

    setPendingAttachment(null);
    setIsSending(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((p) => p + emoji);
    textareaRef.current?.focus();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  // ==================== VOICE RECORDER ====================

  const cleanupRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (recordStreamRef.current) {
      recordStreamRef.current.getTracks().forEach((t) => t.stop());
      recordStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    recordChunksRef.current = [];
    setIsRecording(false);
    setRecordDuration(0);
    setCancelHint(null);
    dragStateRef.current = { active: false, startX: 0, startY: 0, cancelled: false };
  };

  const startRecording = async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setUploadError('Trình duyệt không hỗ trợ ghi âm.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      recordStreamRef.current = stream;

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const cancelled = dragStateRef.current.cancelled;
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(recordChunksRef.current, { type: mimeType });
        const elapsedSec = (Date.now() - recordStartRef.current) / 1000;

        // Dọn stream trước khi upload
        cleanupRecording();

        if (cancelled) return;
        if (blob.size < 800 || elapsedSec < 0.4) {
          setUploadError('Bản ghi quá ngắn.');
          return;
        }

        await uploadVoiceBlob(blob, mimeType, Math.round(elapsedSec));
      };

      recorder.start();
      recordStartRef.current = Date.now();
      setIsRecording(true);
      setCancelHint('hold');
      dragStateRef.current = { active: true, startX: 0, startY: 0, cancelled: false };

      recordTimerRef.current = setInterval(() => {
        const sec = (Date.now() - recordStartRef.current) / 1000;
        setRecordDuration(sec);
        if (sec >= MAX_VOICE_SECONDS) {
          mediaRecorderRef.current?.stop();
        }
      }, 100);
    } catch (err) {
      setUploadError('Không thể truy cập microphone.');
      cleanupRecording();
    }
  };

  const stopRecording = (cancel: boolean) => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    dragStateRef.current.cancelled = cancel;
    try {
      rec.stop();
    } catch {
      cleanupRecording();
    }
  };

  // Pointer move tracking — kéo lên trên 80px hoặc sang trái 120px thì cancel
  const handleRecordPointerMove = (e: React.PointerEvent) => {
    if (!isRecording || !dragStateRef.current.active) return;
    const dy = dragStateRef.current.startY - e.clientY; // kéo lên = dương
    const dx = e.clientX - dragStateRef.current.startX; // kéo trái = âm
    if (dy > 80 || dx < -120) {
      setCancelHint('cancel');
      if (!dragStateRef.current.cancelled) {
        dragStateRef.current.cancelled = true;
      }
    } else {
      setCancelHint('hold');
      if (dragStateRef.current.cancelled) {
        dragStateRef.current.cancelled = false;
      }
    }
  };

  const handleRecordPointerDown = (e: React.PointerEvent) => {
    dragStateRef.current.startX = e.clientX;
    dragStateRef.current.startY = e.clientY;
  };

  const uploadVoiceBlob = async (blob: Blob, mimeType: string, durationSec: number) => {
    setUploadError(null);
    setIsUploading(true);
    try {
      const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      const filename = `voice-${Date.now()}.${ext}`;
      const file = new File([blob], filename, { type: mimeType });

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data: AttachmentResult | { error: string } = await res.json();
      if (!res.ok || 'error' in data) {
        setUploadError('error' in data ? data.error : 'Upload thất bại');
        return;
      }

      setPendingAttachment({
        type: 'VOICE',
        mimeType: data.attachment.mimeType,
        filename,
        byteSize: data.attachment.byteSize,
        attachmentId: data.attachment.id,
        storageKey: data.attachment.storageKey,
        durationSec,
      });
    } catch (err) {
      setUploadError('Upload voice thất bại');
    } finally {
      setIsUploading(false);
    }
  };

  // Cleanup khi unmount (tránh stream leak)
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (recordStreamRef.current) recordStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div
      className="border-t border-dark-800 bg-dark-900 p-4 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 bg-accent-500/20 border-2 border-dashed border-accent-500 rounded-lg flex items-center justify-center pointer-events-none">
          <p className="text-accent-300 font-medium">Thả file để đính kèm</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-3">
        {pendingAttachment && pendingAttachment.type !== 'VOICE' && (
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-3 flex items-start gap-3">
            <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-dark-900 flex items-center justify-center">
              {pendingAttachment.type === 'IMAGE' ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={pendingAttachment.url} alt="" className="w-full h-full object-cover" />
              ) : pendingAttachment.type === 'VIDEO' ? (
                <video src={pendingAttachment.url} className="w-full h-full object-cover" muted />
              ) : (
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{pendingAttachment.filename}</p>
              <p className="text-xs text-gray-400">
                {pendingAttachment.type} · {(pendingAttachment.byteSize / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={() => setPendingAttachment(null)}
              className="p-1 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {pendingAttachment && pendingAttachment.type === 'VOICE' && (
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-3 flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent-600/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Tin nhắn thoại</p>
              <p className="text-xs text-gray-400">
                {pendingAttachment.durationSec
                  ? `${Math.floor(pendingAttachment.durationSec / 60)}:${(pendingAttachment.durationSec % 60).toString().padStart(2, '0')}`
                  : '0:00'}
                {' · '}{(pendingAttachment.byteSize / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={() => setPendingAttachment(null)}
              className="p-1 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white"
              title="Xóa"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {uploadError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2">
            {uploadError}
          </div>
        )}

        <div className="flex items-end gap-3">
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-dark-800 text-gray-500 hover:text-gray-300 transition-colors"
            onClick={() => {
              const emojis = ['😀', '😂', '🥰', '😍', '🤔', '👍', '❤️', '🔥', '🎉', '✨'];
              handleEmojiSelect(emojis[Math.floor(Math.random() * emojis.length)]);
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            type="button"
            className="p-2 rounded-lg hover:bg-dark-800 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <div className="flex-1 relative">
            {isRecording ? (
              <div
                className="w-full bg-dark-800 border border-red-500/60 rounded-xl px-4 py-3 flex items-center gap-3 select-none"
                onPointerMove={handleRecordPointerMove}
                onPointerUp={() => stopRecording(dragStateRef.current.cancelled)}
                onPointerLeave={() => dragStateRef.current.active && stopRecording(dragStateRef.current.cancelled)}
                onPointerCancel={() => stopRecording(true)}
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-white font-mono text-sm">
                  {Math.floor(recordDuration / 60).toString()}:{Math.floor(recordDuration % 60).toString().padStart(2, '0')}
                </span>
                <div className="flex-1 flex items-center gap-[2px] h-6">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const phase = (Date.now() / 200 + i) % 1;
                    const h = 30 + Math.abs(Math.sin((Date.now() / 300) + i * 0.7)) * 70;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-full ${cancelHint === 'cancel' ? 'bg-red-500' : 'bg-red-400'}`}
                        style={{ height: `${h}%`, minHeight: '4px' }}
                      />
                    );
                  })}
                </div>
                <span className={`text-xs font-medium ${cancelHint === 'cancel' ? 'text-red-400' : 'text-gray-400'}`}>
                  {cancelHint === 'cancel' ? '↩ Thả để hủy' : '◀ Trượt để hủy'}
                </span>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={pendingAttachment ? 'Thêm chú thích...' : 'Nhập tin nhắn...'}
                rows={1}
                className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                style={{ minHeight: '48px', maxHeight: '150px' }}
              />
            )}
          </div>

          {!isRecording && (message.trim() || pendingAttachment) ? (
            <button
              onClick={handleSend}
              disabled={isSending || isUploading}
              className="p-3 rounded-xl bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          ) : !isRecording ? (
            <button
              type="button"
              onPointerDown={handleRecordPointerDown}
              onPointerUp={() => stopRecording(dragStateRef.current.cancelled)}
              onPointerLeave={() => {}}
              onClick={async (e) => {
                // Click trên desktop (không phải hold) — bắt đầu record bình thường
                e.preventDefault();
                if (!isRecording) await startRecording();
              }}
              onTouchStart={(e) => { e.preventDefault(); }}
              title="Giữ để ghi âm"
              className="p-3 rounded-xl bg-dark-800 border border-dark-700 text-gray-300 hover:bg-dark-700 hover:text-white transition-colors active:bg-red-600 active:border-red-500 active:text-white select-none touch-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

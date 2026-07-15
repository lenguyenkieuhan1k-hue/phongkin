'use client';

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';

interface MessageInputProps {
  roomId: string;
}

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
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
  url: string;
  mimeType: string;
  filename: string;
  byteSize: number;
  attachmentId: string;
  storageKey: string;
}

export default function MessageInput({ roomId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const socketRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const emit = (event: string, data?: any) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, data);
      }
    };

    const handleRecall = (e: CustomEvent<{ messageId: string }>) => {
      emit('message:recall', { messageId: e.detail.messageId });
    };

    window.addEventListener('recall-message', handleRecall as EventListener);

    const socket = (window as any).__socket;
    socketRef.current = socket;

    return () => {
      window.removeEventListener('recall-message', handleRecall as EventListener);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current?.emit('typing:start', { roomId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('typing:stop', { roomId });
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

      const sessionJson = localStorage.getItem('darktalk_session');
      const sessionData = sessionJson ? JSON.parse(sessionJson) : null;
      const token = sessionData?.token || '';
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
      console.error('Upload failed:', err);
      setUploadError('Upload failed');
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

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTyping) {
      setIsTyping(false);
      socketRef.current?.emit('typing:stop', { roomId });
    }

    let type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' = 'TEXT';
    let attachmentId: string | undefined;
    let attachmentMeta: { storageKey: string; mimeType: string; byteSize: number; id: string } | undefined;

    if (pendingAttachment) {
      type = pendingAttachment.type;
      attachmentId = pendingAttachment.attachmentId;
      attachmentMeta = {
        storageKey: pendingAttachment.storageKey,
        mimeType: pendingAttachment.mimeType,
        byteSize: pendingAttachment.byteSize,
        id: pendingAttachment.attachmentId,
      };
    }

    socketRef.current?.emit('message:send', {
      roomId,
      type,
      body: trimmed || undefined,
      attachmentId,
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
    setMessage((prev) => prev + emoji);
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
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className="border-t border-dark-800 bg-dark-900 p-4 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 bg-accent-500/20 border-2 border-dashed border-accent-500 rounded-lg flex items-center justify-center pointer-events-none">
          <p className="text-accent-300 font-medium">Drop file to attach</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-3">
        {pendingAttachment && (
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-3 flex items-start gap-3">
            <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-dark-900 flex items-center justify-center">
              {pendingAttachment.type === 'IMAGE' ? (
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
              title="Remove"
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
          {/* Emoji button */}
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-dark-800 text-gray-500 hover:text-gray-300 transition-colors"
            onClick={() => {
              const emojis = ['😀', '😂', '🥰', '😍', '🤔', '👍', '❤️', '🔥', '🎉', '✨'];
              const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
              handleEmojiSelect(randomEmoji);
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Attach button */}
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
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.md,.json,.xml,.zip,.rar,.7z,.tar,.gz,.mp4,.m4v,.mov,.webm,.mkv,.avi,.wmv,.flv,.mp3,.m4a,.wav,.ogg,.opus,.flac,.aac,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.tif,.tiff,.heic,.avif"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={pendingAttachment ? 'Add a caption...' : 'Type a message...'}
              rows={1}
              className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              style={{ minHeight: '48px', maxHeight: '150px' }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={(!message.trim() && !pendingAttachment) || isSending || isUploading}
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
        </div>
      </div>
    </div>
  );
}
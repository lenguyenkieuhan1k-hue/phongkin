'use client';

import { useState } from 'react';
import VoiceBubble from './VoiceBubble';

interface Attachment {
  id: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
}

interface Message {
  id: string;
  type: string;
  body?: string;
  attachments?: Attachment[];
}

interface MessageContentProps {
  message: Message;
  isOwn: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('video/')) {
    return (
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  if (mimeType.startsWith('audio/')) {
    return (
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

export default function MessageContent({ message, isOwn }: MessageContentProps) {
  if (message.type === 'TEXT' || message.type === 'SYSTEM') {
    return (
      <p className="text-sm whitespace-pre-wrap break-words">
        {message.body}
      </p>
    );
  }

  if (message.type === 'IMAGE' && message.attachments?.[0]) {
    const attachment = message.attachments[0];
    const src = `/api/media/${attachment.id}`;
    return (
      <div className="space-y-2 -mx-1">
        <a href={src} target="_blank" rel="noreferrer" className="block">
          <img
            src={src}
            alt="Shared image"
            className="rounded-lg max-w-[320px] max-h-[400px] object-cover hover:opacity-95 transition-opacity cursor-pointer"
            loading="lazy"
          />
        </a>
        {message.body && (
          <p className="text-sm whitespace-pre-wrap break-words px-1">{message.body}</p>
        )}
      </div>
    );
  }

  if (message.type === 'VIDEO' && message.attachments?.[0]) {
    const attachment = message.attachments[0];
    const src = `/api/media/${attachment.id}`;
    const filename = attachment.storageKey.split('/').pop() || 'video';
    return (
      <div className="space-y-2 -mx-1">
        <video
          src={src}
          controls
          playsInline
          preload="metadata"
          className="rounded-lg max-w-[360px] max-h-[400px] bg-black w-full"
        />
        <p className="text-xs text-gray-400 px-1 truncate">
          {filename} · {attachment.mimeType.replace('video/', '').toUpperCase()} · {formatBytes(attachment.byteSize)}
        </p>
        {message.body && (
          <p className="text-sm whitespace-pre-wrap break-words px-1">{message.body}</p>
        )}
      </div>
    );
  }

  if (message.type === 'AUDIO' && message.attachments?.[0]) {
    const attachment = message.attachments[0];
    const src = `/api/media/${attachment.id}`;
    const filename = attachment.storageKey.split('/').pop() || 'audio';
    return (
      <div className="space-y-2 min-w-[240px]">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-xs text-gray-300 truncate flex-1">{filename}</p>
        </div>
        <audio
          src={src}
          controls
          preload="metadata"
          className="w-full"
        />
        {message.body && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
        )}
      </div>
    );
  }

  if (message.type === 'FILE' && message.attachments?.[0]) {
    const attachment = message.attachments[0];
    const src = `/api/media/${attachment.id}`;
    return (
      <div className="flex items-center gap-3 bg-black/20 rounded-lg p-3 min-w-[220px]">
        <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0">
          {getFileIcon(attachment.mimeType)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{attachment.storageKey.split('/').pop()}</p>
          <p className="text-xs text-gray-400">{formatBytes(attachment.byteSize)}</p>
        </div>
        <a
          href={src}
          download
          target="_blank"
          rel="noreferrer"
          className={`p-2 rounded-lg ${
            isOwn ? 'hover:bg-accent-500' : 'hover:bg-dark-700'
          } transition-colors flex-shrink-0`}
          title="Download"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      </div>
    );
  }

  if (message.type === 'VOICE' && message.attachments?.[0]) {
    return (
      <div className="-mx-2">
        <VoiceBubble attachment={message.attachments[0]} isOwn={isOwn} />
      </div>
    );
  }

  return null;
}
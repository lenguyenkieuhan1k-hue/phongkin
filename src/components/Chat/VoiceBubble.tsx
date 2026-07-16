'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

interface Attachment {
  id: string;
  storageKey: string;
  mimeType: string;
  byteSize: number | string;
}

interface VoiceBubbleProps {
  attachment: Attachment;
  isOwn: boolean;
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Sinh waveform giả lập từ byteSize để ổn định giữa các lần render (không random mỗi lần)
function generateWaveform(seed: number, bars = 36): number[] {
  const out: number[] = [];
  let x = seed % 2147483647;
  for (let i = 0; i < bars; i++) {
    x = (x * 16807) % 2147483647;
    // Map về 0.25 - 1.0 để bar nào cũng nhìn được
    out.push(0.25 + (x / 2147483647) * 0.75);
  }
  return out;
}

export default function VoiceBubble({ attachment, isOwn }: VoiceBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const byteSizeNum = typeof attachment.byteSize === 'string'
    ? parseInt(attachment.byteSize, 10)
    : attachment.byteSize;

  // Seed từ attachment.id để waveform ổn định
  const seed = useMemo(() => 
    attachment.id
      .split('')
      .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 2147483647, 7),
    [attachment.id]
  );

  // Memoize waveform để tránh recalculate
  const waveform = useMemo(() => generateWaveform(seed), [seed]);

  // Memoize bar states để tránh re-render không cần thiết
  const barStates = useMemo(() => 
    waveform.map((amp, i) => ({
      amp,
      filled: i / waveform.length <= progress
    })),
    [waveform, progress]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else {
        // Fallback: ước lượng từ size (~16KB/s cho voice)
        const estimated = Math.max(1, Math.round(byteSizeNum / 16000));
        setDuration(estimated);
      }
    };
    const onTime = () => {
      if (audio.duration > 0) {
        setProgress(audio.currentTime / audio.duration);
        setCurrentTime(audio.currentTime);
      }
    };
    const onEnd = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [byteSizeNum]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      // Reset nếu đã play hết
      if (audio.ended) audio.currentTime = 0;
      audio.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  }, []);

  return (
    <div className="flex items-center gap-3 min-w-[220px] py-1">
      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isOwn
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-accent-600 hover:bg-accent-500 text-white'
        }`}
        aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          className="flex items-center gap-[2px] h-8 cursor-pointer"
          onClick={seek}
        >
          {barStates.map(({ amp, filled }, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-colors ${
                filled
                  ? isOwn ? 'bg-white' : 'bg-accent-400'
                  : isOwn ? 'bg-white/30' : 'bg-dark-600'
              }`}
              style={{ height: `${amp * 100}%`, minHeight: '4px' }}
            />
          ))}
        </div>
        <div className={`text-[11px] font-mono ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
          {formatDuration(isPlaying || progress > 0 ? currentTime : duration)}
        </div>
      </div>

      <audio ref={audioRef} src={`/api/media/${attachment.id}`} preload="metadata" />
    </div>
  );
}
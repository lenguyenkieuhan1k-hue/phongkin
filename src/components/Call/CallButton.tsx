'use client';

import { useState, useRef, useEffect } from 'react';
import { useRoomStore } from '@/hooks/useStore';
import { useVoiceCall } from '@/hooks/useVoiceCall';

export default function CallButton() {
  const members = useRoomStore((s) => s.members);
  const guestId = useRoomStore((s) => s.guestId);
  const { status } = useVoiceCall();
  const [open, setOpen] = useState(false);
  const [targetMember, setTargetMember] = useState<{ guestId: string; handle: string } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const otherMembers = members.filter((m) => m.guestId !== guestId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
        setTargetMember(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (otherMembers.length === 0) return null;

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
          ${status === 'connected' || status === 'calling' || status === 'ringing'
            ? 'bg-accent-500/20 text-accent-400 border border-accent-400/40 animate-pulse'
            : 'bg-gradient-to-br from-accent-400/20 to-accent-600/20 text-accent-300 border border-accent-400/30 hover:border-accent-400/60'
          }
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
        Gọi
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-dark-800/95 backdrop-blur-xl border border-accent-400/20 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-dark-700/50">
            <p className="text-xs text-gray-400">Gọi thoại 1-1</p>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {otherMembers.map((member) => (
              <button
                key={member.guestId}
                onClick={() => setTargetMember(member)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-dark-700/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {member.handle.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm text-white truncate">{member.handle}</p>
                  {member.isOwner && <p className="text-xs text-accent-400">Chủ phòng</p>}
                </div>
                <svg className="w-4 h-4 text-accent-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

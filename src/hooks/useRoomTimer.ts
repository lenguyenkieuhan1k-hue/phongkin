'use client';

import { useEffect, useState, useCallback } from 'react';

export function useRoomTimer(expiresAtIso: string | null) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!expiresAtIso) {
      setTimeLeft('--:--');
      return;
    }

    const tick = () => {
      const diff = new Date(expiresAtIso).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00');
        setExpired(true);
        return;
      }
      setExpired(false);
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        setTimeLeft(
          `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      } else {
        setTimeLeft(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAtIso]);

  return { timeLeft, expired };
}

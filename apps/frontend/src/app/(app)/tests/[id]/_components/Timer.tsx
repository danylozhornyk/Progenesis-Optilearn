'use client';

import { useEffect, useRef, useState } from 'react';
import { ClockIcon } from './icons';

/**
 * Counts down from `totalSeconds`, calling `onExpire` exactly once when the
 * timer reaches zero. Caller can re-mount with `key={...}` to restart.
 */
export function Timer({ totalSeconds, onExpire }: { totalSeconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0) {
      if (!expiredRef.current) { expiredRef.current = true; onExpire(); }
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const urgent = remaining <= 60;

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium tabular-nums ${urgent ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
      <ClockIcon />
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}

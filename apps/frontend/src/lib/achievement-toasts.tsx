'use client';

/**
 * Achievement-toast context.
 *
 * After a test submission the server returns `newAchievements[]`. Call
 * `pushAchievementToasts(list)` from anywhere inside the app layout to queue
 * the notification cards.  The `AchievementToastContainer` component (mounted
 * in the (app) layout) renders and manages them.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

// ── Public shape of a single queued toast ────────────────────
export interface ToastAchievement {
  /** Runtime-unique ID so React can key the card. */
  toastId: string;
  code: string;
  name: string;
  nameUk: string | null;
  description: string;
  descriptionUk: string | null;
  category: 'PROGRESS' | 'SKILL' | 'STREAK' | 'SOCIAL';
  pointsAwarded: number;
  iconUrl: string | null;
}

// ── Context ────────────────────────────────────────────────
interface AchievementToastCtx {
  toasts: ToastAchievement[];
  push: (items: Omit<ToastAchievement, 'toastId'>[]) => void;
  dismiss: (toastId: string) => void;
}

const Ctx = createContext<AchievementToastCtx | null>(null);

// ── Provider ───────────────────────────────────────────────
export function AchievementToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastAchievement[]>([]);

  const push = useCallback((items: Omit<ToastAchievement, 'toastId'>[]) => {
    const stamped = items.map((item) => ({
      ...item,
      toastId: `${item.code}-${Date.now()}-${Math.random()}`,
    }));
    // Append to end → newest card sits at the bottom of the stack
    setToasts((prev) => [...prev, ...stamped]);
  }, []);

  const dismiss = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  }, []);

  return <Ctx.Provider value={{ toasts, push, dismiss }}>{children}</Ctx.Provider>;
}

// ── Hook ───────────────────────────────────────────────────
export function useAchievementToasts() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAchievementToasts must be used inside AchievementToastProvider');
  return ctx;
}

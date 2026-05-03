'use client';

/**
 * AchievementToastContainer
 *
 * Fixed bottom-right stack of achievement notification cards.
 * Each card shows the hex badge (with points underneath), the achievement
 * name, and the requirement description.
 *
 * Dismiss a card by:
 *   • clicking the × button in the top-right corner
 *   • right-clicking anywhere on the card
 *
 * New cards are appended to the bottom of the stack; older ones slide upward.
 * Every card enters with a slide-in-from-right animation.
 */

import { useEffect, useRef, useState } from 'react';
import { useAchievementToasts, type ToastAchievement } from '@/lib/achievement-toasts';
import { useT } from '@/lib/i18n';

// ── Hex clip-path (pointy-top hexagon) ───────────────────────
const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

// ── Category colours (gradient fill of the hex inner layer) ─
const CATEGORY_GRADIENTS: Record<string, string> = {
  PROGRESS: 'from-amber-400 to-orange-500',
  SKILL:    'from-indigo-400 to-violet-600',
  STREAK:   'from-emerald-400 to-teal-600',
  SOCIAL:   'from-pink-400 to-rose-600',
};

const CATEGORY_LETTER: Record<string, string> = {
  PROGRESS: 'P',
  SKILL:    'S',
  STREAK:   'R',
  SOCIAL:   'C',
};

// ── Container ─────────────────────────────────────────────────
export function AchievementToastContainer() {
  const { toasts, dismiss } = useAchievementToasts();

  if (toasts.length === 0) return null;

  return (
    // pointer-events-none on the wrapper so it never blocks clicks on the page.
    // Each card re-enables pointer events for itself.
    <div
      aria-live="polite"
      aria-label="Achievement notifications"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.toastId} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

// ── Individual card ────────────────────────────────────────────

interface ToastCardProps {
  toast: ToastAchievement;
  onDismiss: (id: string) => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const { locale, t } = useT();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger the enter animation on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function startDismiss() {
    if (leaving) return;
    setLeaving(true);
    leaveTimer.current = setTimeout(() => onDismiss(toast.toastId), 300);
  }

  useEffect(() => () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);

  const name        = (locale === 'uk' && toast.nameUk)        ? toast.nameUk        : toast.name;
  const description = (locale === 'uk' && toast.descriptionUk) ? toast.descriptionUk : toast.description;
  const gradient    = CATEGORY_GRADIENTS[toast.category] ?? 'from-zinc-400 to-zinc-600';
  const letter      = CATEGORY_LETTER[toast.category]    ?? '?';

  return (
    <div
      role="alert"
      onContextMenu={(e) => { e.preventDefault(); startDismiss(); }}
      // Slide in from right on enter, slide out on leave
      style={{
        transform: visible && !leaving ? 'translateX(0)' : 'translateX(calc(100% + 24px))',
        opacity:   visible && !leaving ? 1 : 0,
        transition: 'transform 300ms cubic-bezier(0.34,1.26,0.64,1), opacity 280ms ease',
        willChange: 'transform, opacity',
      }}
      className={[
        'pointer-events-auto w-80 rounded-xl shadow-2xl border border-border',
        'bg-background/95 backdrop-blur-sm',
        'flex items-start gap-4 p-4 pr-3',
        'ring-1 ring-black/5 dark:ring-white/10',
      ].join(' ')}
    >
      {/* ── Hex badge + points ── */}
      <div className="shrink-0 flex flex-col items-center gap-1">
        {/* Outer border layer */}
        <div className="relative w-14 h-[62px]">
          <div
            className="absolute inset-0 bg-white/30 dark:bg-white/20 drop-shadow"
            style={{ clipPath: HEX_CLIP }}
          />
          {/* Inner fill layer */}
          <div
            className={`absolute flex items-center justify-center bg-gradient-to-br ${gradient}`}
            style={{
              clipPath: HEX_CLIP,
              top: 2, left: 2,
              width: 'calc(100% - 4px)',
              height: 'calc(100% - 4px)',
            }}
          >
            {toast.iconUrl ? (
              <img
                src={toast.iconUrl}
                alt=""
                className="w-full h-full object-contain p-1.5 select-none"
                draggable={false}
              />
            ) : (
              <span className="text-xl font-bold text-white select-none">
                {letter}
              </span>
            )}
          </div>
        </div>

        {/* Points label */}
        <span className="text-[11px] font-semibold tabular-nums text-muted-foreground leading-none">
          {t('achievements.points', { n: toast.pointsAwarded })}
        </span>
      </div>

      {/* ── Text content ── */}
      <div className="flex-1 min-w-0 pt-0.5">
        {/* "Achievement unlocked" eyebrow */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
          {t('achievements.unlocked')}
        </p>
        <p className="text-sm font-semibold text-foreground leading-snug truncate">
          {name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
          {description}
        </p>
      </div>

      {/* ── Dismiss button ── */}
      <button
        type="button"
        onClick={startDismiss}
        aria-label="Dismiss"
        className="shrink-0 mt-0.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M1 1l12 12M13 1L1 13" />
        </svg>
      </button>
    </div>
  );
}

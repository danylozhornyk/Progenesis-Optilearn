'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { CheckIcon, LockIcon } from './icons';
import {
  AchievementDef,
  EarnedAchievement,
  CATEGORY_GRADIENTS,
  CATEGORY_LETTER,
} from './types';

// Pointy-top hexagon clip-path used by every badge tile.
const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

/**
 * "Achievements" tab: hex-badge grid sorted by earned-first then by points
 * descending. Each tile shows the badge, a status corner (check / lock), the
 * point value, and a hover/focus tooltip with full meta.
 */
export function AchievementsTab() {
  const { user } = useAuth();
  const { t, locale } = useT();

  const [definitions, setDefinitions] = useState<AchievementDef[]>([]);
  const [earned, setEarned] = useState<EarnedAchievement[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setAchievementsLoading(true);
    Promise.all([
      api.get<AchievementDef[]>('/achievements/definitions'),
      api.get<EarnedAchievement[]>(`/achievements/user/${user.id}`),
    ])
      .then(([defs, earnedList]) => {
        setDefinitions(defs);
        setEarned(earnedList);
      })
      .catch(() => {})
      .finally(() => setAchievementsLoading(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const earnedByCode = new Map(earned.map((e) => [e.code, e]));

  // Total points: sum across all definitions (the maximum possible).
  // Earned points: sum across the user's earned rows (uses pointsAwarded
  // which is captured at award time, not the live definition value).
  const totalPoints = definitions.reduce((sum, d) => sum + (d.pointsAwarded ?? 0), 0);
  const earnedPoints = earned.reduce((sum, e) => sum + (e.pointsAwarded ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">{t('profile.achievements.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('profile.achievements.subtitle')}</p>
        </div>
        {!achievementsLoading && definitions.length > 0 && (
          <span
            className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-foreground tabular-nums"
            title={t('profile.achievements.pointsSummary', { earned: earnedPoints, total: totalPoints })}
          >
            {t('profile.achievements.pointsSummary', { earned: earnedPoints, total: totalPoints })}
          </span>
        )}
      </div>

      {achievementsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-6">
          {[...definitions]
            .sort((a, b) => {
              // Earned group first, locked group second.
              // Within each group sort by pointsAwarded descending.
              const aEarned = earnedByCode.has(a.code);
              const bEarned = earnedByCode.has(b.code);
              if (aEarned !== bEarned) return aEarned ? -1 : 1;
              return b.pointsAwarded - a.pointsAwarded;
            })
            .map((def) => (
              <AchievementBadge
                key={def.code}
                def={def}
                earnedRow={earnedByCode.get(def.code)}
                locale={locale}
                t={t}
              />
            ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Single badge tile: hex (border + fill layers), status corner, tooltip,
// points label below.
// ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  def: AchievementDef;
  earnedRow: EarnedAchievement | undefined;
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

function AchievementBadge({ def, earnedRow, locale, t }: BadgeProps) {
  const isEarned = !!earnedRow;
  const name = (locale === 'uk' && def.nameUk) ? def.nameUk : def.name;
  const description = (locale === 'uk' && def.descriptionUk) ? def.descriptionUk : def.description;
  const earnedDate = earnedRow?.awardedAt
    ? new Date(earnedRow.awardedAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : null;

  return (
    <div
      className="group flex flex-col items-center gap-1.5"
      tabIndex={0}
      aria-label={name}
    >
      {/* Hex badge + status indicator wrapper */}
      <div className="relative w-20 h-[88px] transition-transform group-hover:scale-105">

        {/* ── Border layer (outer hex, full size) ── */}
        <div
          className={`absolute inset-0 ${
            isEarned
              ? 'bg-white/30 dark:bg-white/20 drop-shadow-md'
              : 'bg-slate-400 dark:bg-slate-500'
          }`}
          style={{ clipPath: HEX_CLIP }}
        />

        {/* ── Fill layer (inner hex, inset 3px on each side) ── */}
        <div
          className={`absolute flex items-center justify-center ${
            isEarned
              ? `bg-gradient-to-br ${CATEGORY_GRADIENTS[def.category]}`
              : 'bg-slate-200 dark:bg-slate-600'
          }`}
          style={{
            clipPath: HEX_CLIP,
            top: 3,
            left: 3,
            width: 'calc(100% - 6px)',
            height: 'calc(100% - 6px)',
          }}
        >
          {def.iconUrl ? (
            <img
              src={def.iconUrl}
              alt=""
              className="w-full h-full object-contain p-2 select-none"
              draggable={false}
            />
          ) : (
            <span className={`text-2xl font-bold ${isEarned ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`}>
              {CATEGORY_LETTER[def.category]}
            </span>
          )}
        </div>

        {/* Status indicator */}
        <div
          className={`absolute -bottom-1 right-0 w-7 h-7 rounded-full flex items-center justify-center shadow ring-2 ring-background ${
            isEarned
              ? 'bg-green-500 text-white'
              : 'bg-muted text-muted-foreground'
          }`}
          aria-hidden="true"
        >
          {isEarned ? <CheckIcon /> : <LockIcon />}
        </div>

        {/* Hover/focus tooltip — holds ALL meta */}
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 left-1/2 -translate-x-1/2 bottom-full mb-3 w-60 p-3 rounded-lg bg-foreground text-background text-xs leading-relaxed shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-opacity space-y-1.5 text-left"
        >
          <p className="font-semibold text-sm">{name}</p>
          <p className="opacity-90 text-[11px] uppercase tracking-wide">
            {isEarned ? t('profile.achievements.earned') : t('profile.achievements.locked')}
          </p>
          <p className="opacity-80">
            <span className="font-medium opacity-100">{t('profile.achievements.howTo')}:</span>{' '}
            {description}
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-background/20">
            <span className="opacity-80">
              {t('profile.achievements.category')}:{' '}
              <span className="font-medium opacity-100">
                {t(`profile.achievements.categoryLabel.${def.category}`)}
              </span>
            </span>
            <span className="opacity-80 font-medium">
              {t('profile.achievements.points', { n: def.pointsAwarded })}
            </span>
          </div>
          {earnedDate && (
            <p className="opacity-70 pt-1 border-t border-background/20">
              {t('profile.achievements.earnedOn', { date: earnedDate })}
            </p>
          )}
          {/* Arrow */}
          <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-foreground rotate-45" />
        </div>
      </div>

      {/* Points label — always visible below badge */}
      <span className="text-[11px] tabular-nums font-medium leading-none text-muted-foreground">
        {t('profile.achievements.points', { n: def.pointsAwarded })}
      </span>
    </div>
  );
}

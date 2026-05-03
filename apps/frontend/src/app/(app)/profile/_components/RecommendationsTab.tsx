'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type {
  AiRecommendation,
  RecommendationPriority,
} from './types';

const PRIORITY_STYLES: Record<RecommendationPriority, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

/**
 * "Recommendations" tab: shows past AI-generated learning recommendations
 * (newest first) and a button to request a fresh analysis. The backend
 * rate-limits generation to one every 30 minutes — when that fires we surface
 * the server's error message.
 */
export function RecommendationsTab() {
  const { user } = useAuth();
  const { t } = useT();

  const [items, setItems] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api
      .get<AiRecommendation[]>('/recommendations/my')
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    if (generating) return;
    setError('');
    setGenerating(true);
    try {
      const fresh = await api.post<AiRecommendation>('/recommendations/generate', {});
      // Prepend the new analysis to the list so it appears at the top.
      setItems((prev) => [fresh, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 mb-2">
        <h2 className="text-base font-semibold text-foreground">
          {t('profile.recommendations.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('profile.recommendations.subtitle')}
        </p>
      </div>

      {/* Generate action */}
      <div className="surface p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {t('profile.recommendations.generateTitle')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('profile.recommendations.generateHint')}
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="text-sm shrink-0"
        >
          {generating
            ? t('profile.recommendations.generating')
            : t('profile.recommendations.generate')}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 bg-muted rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('profile.recommendations.empty')}
        </p>
      ) : (
        items.map((rec, idx) => (
          <RecommendationCard key={rec.id} rec={rec} isLatest={idx === 0} />
        ))
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// One recommendation card. Always renders the latest one expanded; older
// entries collapse to a header that the user can click open.
// ────────────────────────────────────────────────────────────────────

function RecommendationCard({
  rec,
  isLatest,
}: {
  rec: AiRecommendation;
  isLatest: boolean;
}) {
  const { t, locale } = useT();
  const [open, setOpen] = useState(isLatest);

  const date = new Date(rec.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Pick the localized analysis; fall back to English for legacy rows that
  // were generated before we stored a Ukrainian version.
  const a = (locale === 'uk' && rec.analysisUk) ? rec.analysisUk : rec.analysis;

  return (
    <div className="surface p-5 space-y-4">
      {/* Header — always visible, click to toggle for non-latest */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {isLatest
                ? t('profile.recommendations.latest')
                : t('profile.recommendations.archived')}
            </p>
            {isLatest && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-foreground text-background">
                {t('profile.recommendations.newBadge')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-muted-foreground transition-transform shrink-0 mt-1 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="space-y-4 pt-1 border-t border-border">

          {/* Overall */}
          <div className="space-y-1 pt-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              {t('profile.recommendations.overall')}
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {a.overallPerformance}
            </p>
          </div>

          {/* Strong / weak grids */}
          {(a.strongAreas.length > 0 || a.weakAreas.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {a.strongAreas.length > 0 && (
                <AreaList
                  label={t('profile.recommendations.strongAreas')}
                  tone="green"
                  items={a.strongAreas}
                />
              )}
              {a.weakAreas.length > 0 && (
                <AreaList
                  label={t('profile.recommendations.weakAreas')}
                  tone="orange"
                  items={a.weakAreas}
                />
              )}
            </div>
          )}

          {/* Action items with priority */}
          {a.recommendations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                {t('profile.recommendations.actions')}
              </p>
              <ul className="space-y-2">
                {a.recommendations.map((r, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-border p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {r.action}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${PRIORITY_STYLES[r.priority]}`}
                      >
                        {t(`profile.recommendations.priority.${r.priority}`)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {r.reason}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next steps */}
          {a.nextSteps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                {t('profile.recommendations.nextSteps')}
              </p>
              <ol className="space-y-1 list-decimal list-inside text-sm text-foreground">
                {a.nextSteps.map((step, i) => (
                  <li key={i} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Bullet-list of strong / weak areas.
// ────────────────────────────────────────────────────────────────────

function AreaList({
  label,
  tone,
  items,
}: {
  label: string;
  tone: 'green' | 'orange';
  items: { topic: string; reason: string }[];
}) {
  const dotClass =
    tone === 'green'
      ? 'bg-green-500'
      : 'bg-orange-500';

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </p>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{it.topic}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {it.reason}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { AiRecommendation, AiAnalysis, RecommendationPriority } from './types';

const PRIORITY_BADGE: Record<RecommendationPriority, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const PRIORITY_CIRCLE: Record<RecommendationPriority, string> = {
  HIGH: 'bg-red-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-blue-500',
};

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
        <Button onClick={handleGenerate} disabled={generating} className="text-sm shrink-0">
          {generating
            ? t('profile.recommendations.generating')
            : t('profile.recommendations.generate')}
        </Button>
      </div>

      {generating && (
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 mt-0.5 text-muted-foreground animate-spin"
          >
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              {t('profile.recommendations.processingTitle')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('profile.recommendations.processingHint')}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

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

// ─────────────────────────────────────────────────────────────────────────────
// Card: latest always open, older ones collapsible
// ─────────────────────────────────────────────────────────────────────────────

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

  const a: AiAnalysis =
    (locale === 'uk' && rec.analysisUk) ? rec.analysisUk : rec.analysis;

  const isNewFormat = !!a.stats;

  return (
    <div className="surface p-5 space-y-4">
      {/* Collapsible header */}
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
        <div className="space-y-5 pt-1 border-t border-border">
          {isNewFormat ? (
            <NewFormatBody a={a} />
          ) : (
            <LegacyBody a={a} />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// New format body: stats → summary → points grid → roadmap
// ─────────────────────────────────────────────────────────────────────────────

function NewFormatBody({ a }: { a: AiAnalysis }) {
  const { t } = useT();
  const stats = a.stats!;

  return (
    <>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-3">
        <StatCard
          label={t('profile.recommendations.stats.attempts')}
          value={String(stats.totalAttempts)}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          }
        />
        <StatCard
          label={t('profile.recommendations.stats.avgScore')}
          value={`${stats.avgScore.toFixed(1)}%`}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          }
          highlight={stats.avgScore >= 70}
        />
        <StatCard
          label={t('profile.recommendations.stats.passRate')}
          value={`${stats.passRate.toFixed(1)}%`}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          highlight={stats.passRate >= 70}
        />
      </div>

      {/* Summary */}
      {a.summary && (
        <div className="pl-3 border-l-2 border-foreground/20">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
            {t('profile.recommendations.summary')}
          </p>
          <p className="text-sm text-foreground leading-relaxed text-justify">{a.summary}</p>
        </div>
      )}

      {/* Strong / weak points */}
      {((a.strongPoints?.length ?? 0) > 0 || (a.weakPoints?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(a.strongPoints?.length ?? 0) > 0 && (
            <PointList
              label={t('profile.recommendations.strongPoints')}
              tone="green"
              items={a.strongPoints!}
            />
          )}
          {(a.weakPoints?.length ?? 0) > 0 && (
            <PointList
              label={t('profile.recommendations.weakPoints')}
              tone="orange"
              items={a.weakPoints!}
            />
          )}
        </div>
      )}

      {/* Roadmap */}
      {(a.roadmap?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            {t('profile.recommendations.roadmap')}
          </p>
          <div>
            {a.roadmap!.map((step, i) => (
              <RoadmapStep
                key={i}
                step={step}
                isLast={i === a.roadmap!.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy body: renders the old structure for rows generated before restructure
// ─────────────────────────────────────────────────────────────────────────────

function LegacyBody({ a }: { a: AiAnalysis }) {
  const { t } = useT();

  return (
    <>
      {a.overallPerformance && (
        <div className="space-y-1 pt-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            {t('profile.recommendations.overall')}
          </p>
          <p className="text-sm text-foreground leading-relaxed text-justify">{a.overallPerformance}</p>
        </div>
      )}

      {((a.strongAreas?.length ?? 0) > 0 || (a.weakAreas?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(a.strongAreas?.length ?? 0) > 0 && (
            <AreaList
              label={t('profile.recommendations.strongAreas')}
              tone="green"
              items={a.strongAreas!}
            />
          )}
          {(a.weakAreas?.length ?? 0) > 0 && (
            <AreaList
              label={t('profile.recommendations.weakAreas')}
              tone="orange"
              items={a.weakAreas!}
            />
          )}
        </div>
      )}

      {(a.recommendations?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            {t('profile.recommendations.actions')}
          </p>
          <ul className="space-y-2">
            {a.recommendations!.map((r, i) => (
              <li key={i} className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{r.action}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${PRIORITY_BADGE[r.priority]}`}>
                    {t(`profile.recommendations.priority.${r.priority}`)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed text-justify">{r.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(a.nextSteps?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            {t('profile.recommendations.nextSteps')}
          </p>
          <ol className="space-y-1 list-decimal list-inside text-sm text-foreground">
            {a.nextSteps!.map((step, i) => (
              <li key={i} className="leading-relaxed text-justify">{step}</li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card — used in the new format stats row
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-border p-3 flex flex-col gap-1.5 ${highlight ? 'bg-foreground/[0.04]' : ''}`}
    >
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-base font-bold text-foreground leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Point list — strong / weak points in the new format
// ─────────────────────────────────────────────────────────────────────────────

function PointList({
  label,
  tone,
  items,
}: {
  label: string;
  tone: 'green' | 'orange';
  items: { topic: string; detail: string }[];
}) {
  const bg = tone === 'green'
    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40'
    : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40';
  const dot = tone === 'green' ? 'bg-green-500' : 'bg-orange-500';

  return (
    <div className={`rounded-lg border p-3 space-y-2.5 ${bg}`}>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          {label}
        </p>
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm">
            <p className="font-medium text-foreground">{it.topic}</p>
            <p className="text-xs text-muted-foreground leading-relaxed text-justify">{it.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Roadmap step — timeline row with priority-coloured step circle
// ─────────────────────────────────────────────────────────────────────────────

function RoadmapStep({
  step,
  isLast,
}: {
  step: {
    step: number;
    title: string;
    description: string;
    priority: RecommendationPriority;
  };
  isLast: boolean;
}) {
  const { t } = useT();

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div
          className={`w-7 h-7 rounded-full ${PRIORITY_CIRCLE[step.priority]} flex items-center justify-center text-white text-xs font-bold shrink-0`}
        >
          {step.step}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-border mt-1 min-h-[20px]" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-4'}`}>
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="text-sm font-semibold text-foreground">{step.title}</p>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${PRIORITY_BADGE[step.priority]}`}
          >
            {t(`profile.recommendations.priority.${step.priority}`)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed text-justify">{step.description}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy area list — retained for old-format rows
// ─────────────────────────────────────────────────────────────────────────────

function AreaList({
  label,
  tone,
  items,
}: {
  label: string;
  tone: 'green' | 'orange';
  items: { topic: string; reason: string }[];
}) {
  const dot = tone === 'green' ? 'bg-green-500' : 'bg-orange-500';

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </p>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{it.topic}</p>
              <p className="text-xs text-muted-foreground leading-relaxed text-justify">{it.reason}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

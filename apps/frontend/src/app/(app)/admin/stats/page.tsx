'use client';

/**
 * Admin → Statistics dashboard.
 *
 * Loads /admin/stats and renders:
 *   • Top KPI cards (totals + 24h activity)
 *   • Pure-SVG stacked bar chart of daily passing/failing submissions
 *     for the last 7 or 30 days (toggle)
 *   • Top users by achievement points
 *   • Per-course leaderboard (enrolled / completed)
 *
 * No external chart library — keeps the bundle size minimal.
 */

import { useEffect, useMemo, useState } from 'react';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';

type DayBucket = { date: string; passed: number; failed: number };

interface AdminStats {
  users: {
    total: number;
    newLast7Days: number;
  };
  courses: {
    total: number;
    byStatus: { DRAFT: number; PUBLISHED: number };
    leaderboard: { id: string; title: string; titleUk: string | null; enrolled: number; completed: number }[];
  };
  submissions: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    last24h: number;
    last7Days: DayBucket[];
    last30Days: DayBucket[];
  };
  topUsers: { id: string; fullName: string; email: string; avatarUrl: string | null; points: number }[];
  generatedAt: string;
}

export default function AdminStatsPage() {
  const { t, locale } = useT();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [range, setRange]   = useState<'7' | '30'>('7');

  useEffect(() => {
    setLoading(true);
    api.get<AdminStats>('/admin/stats')
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-sm text-muted-foreground">{t('common.loading')}</div>;
  }
  if (error || !stats) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error || t('common.error')}</p>;
  }

  const buckets = range === '7' ? stats.submissions.last7Days : stats.submissions.last30Days;
  const passPct = (stats.submissions.passRate * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('admin.stats.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin.stats.subtitle')}</p>
      </div>

      {/* ── KPI cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label={t('admin.stats.kpiUsers')}     value={stats.users.total}
                 hint={t('admin.stats.kpiUsersHint', { n: stats.users.newLast7Days })} />
        <KpiCard label={t('admin.stats.kpiCourses')}   value={stats.courses.total}
                 hint={t('admin.stats.kpiCoursesHint', { n: stats.courses.byStatus.PUBLISHED })} />
        <KpiCard label={t('admin.stats.kpiSubmissions')} value={stats.submissions.total}
                 hint={t('admin.stats.kpiSubmissionsHint', { n: stats.submissions.last24h })} />
        <KpiCard label={t('admin.stats.kpiPassRate')}  value={`${passPct}%`}
                 hint={t('admin.stats.kpiPassRateHint', { p: stats.submissions.passed, f: stats.submissions.failed })} />
      </div>

      {/* ── Daily submissions chart ─────────────────────────── */}
      <section className="surface border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">{t('admin.stats.chartTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('admin.stats.chartSubtitle')}</p>
          </div>
          <div className="flex items-center gap-1 rounded-md bg-muted p-0.5">
            {(['7', '30'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs rounded ${range === r ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
              >
                {r === '7' ? t('admin.stats.range7') : t('admin.stats.range30')}
              </button>
            ))}
          </div>
        </div>
        <SubmissionsBarChart buckets={buckets} locale={locale} t={t} />
      </section>

      {/* ── Top users + course leaderboard ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="surface border border-border rounded-lg p-5">
          <h2 className="text-base font-semibold mb-3">{t('admin.stats.topUsers')}</h2>
          {stats.topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.stats.noData')}</p>
          ) : (
            <ul className="space-y-2">
              {stats.topUsers.map((u, i) => (
                <li key={u.id} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums w-5">{i + 1}.</span>
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xs font-semibold">{u.fullName.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{u.points} {t('admin.stats.pts')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface border border-border rounded-lg p-5">
          <h2 className="text-base font-semibold mb-3">{t('admin.stats.courseLeaderboard')}</h2>
          {stats.courses.leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.stats.noData')}</p>
          ) : (
            <ul className="space-y-3">
              {stats.courses.leaderboard.map((c) => {
                const title = (locale === 'uk' && c.titleUk) ? c.titleUk : c.title;
                const pct = c.enrolled > 0 ? (c.completed / c.enrolled) * 100 : 0;
                return (
                  <li key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{title}</span>
                      <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                        {c.completed} / {c.enrolled}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {t('admin.stats.generatedAt', { time: new Date(stats.generatedAt).toLocaleString() })}
      </p>
    </div>
  );
}

// ── KPI card ─────────────────────────────────────────────────
function KpiCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="surface border border-border rounded-lg p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight tabular-nums mt-1">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

// ── Pure SVG stacked bar chart ───────────────────────────────
interface ChartProps {
  buckets: DayBucket[];
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

function SubmissionsBarChart({ buckets, locale, t }: ChartProps) {
  const W = 720, H = 220, PAD_L = 32, PAD_R = 8, PAD_T = 12, PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const maxValue = useMemo(
    () => Math.max(1, ...buckets.map((b) => b.passed + b.failed)),
    [buckets],
  );

  // Round max up to a "nice" number for the y-axis
  const niceMax = useMemo(() => {
    const exp = Math.pow(10, Math.floor(Math.log10(maxValue)));
    return Math.ceil(maxValue / exp) * exp || 1;
  }, [maxValue]);

  const barGap = 2;
  const barW = Math.max(2, (innerW - barGap * (buckets.length - 1)) / buckets.length);

  // Y-axis ticks: 0, ½, max
  const yTicks = [0, niceMax / 2, niceMax];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px]" preserveAspectRatio="none">
        {/* Grid + y labels */}
        {yTicks.map((v) => {
          const y = PAD_T + innerH - (v / niceMax) * innerH;
          return (
            <g key={v}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="currentColor" className="text-border" strokeWidth={1} />
              <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize={10} className="fill-muted-foreground">
                {Math.round(v)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {buckets.map((b, i) => {
          const x = PAD_L + i * (barW + barGap);
          const total = b.passed + b.failed;
          const totalH = (total / niceMax) * innerH;
          const passedH = (b.passed / niceMax) * innerH;
          const failedH = totalH - passedH;
          const yPassed = PAD_T + innerH - passedH;
          const yFailed = yPassed - failedH;

          // Show label every Nth tick to avoid crowding
          const showLabel = buckets.length <= 10 || i % Math.ceil(buckets.length / 10) === 0;
          const label = formatDayShort(b.date, locale);

          return (
            <g key={b.date}>
              <title>
                {b.date} — {t('admin.stats.tooltipPassed', { n: b.passed })}, {t('admin.stats.tooltipFailed', { n: b.failed })}
              </title>
              {/* Failed (top of stack) */}
              {failedH > 0 && (
                <rect x={x} y={yFailed} width={barW} height={failedH} className="fill-rose-400 dark:fill-rose-500" rx={1} />
              )}
              {/* Passed (bottom of stack) */}
              {passedH > 0 && (
                <rect x={x} y={yPassed} width={barW} height={passedH} className="fill-emerald-500 dark:fill-emerald-500" rx={1} />
              )}
              {showLabel && (
                <text
                  x={x + barW / 2}
                  y={H - PAD_B + 14}
                  textAnchor="middle"
                  fontSize={10}
                  className="fill-muted-foreground"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500" />
          {t('admin.stats.legendPassed')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-400 dark:bg-rose-500" />
          {t('admin.stats.legendFailed')}
        </span>
      </div>
    </div>
  );
}

function formatDayShort(yyyyMmDd: string, locale: string) {
  const d = new Date(yyyyMmDd + 'T00:00:00');
  return d.toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-US', {
    month: 'short',
    day:   'numeric',
  });
}

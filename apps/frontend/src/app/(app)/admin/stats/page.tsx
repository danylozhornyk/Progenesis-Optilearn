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
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

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
  topUsers: {
    id: string; fullName: string; email: string; avatarUrl: string | null;
    points: number; achievementCount: number; favoriteCategory: string | null;
  }[];
  userSuccessStats: {
    id: string; fullName: string; email: string; avatarUrl: string | null;
    scorePercent: number; passed: number; failed: number;
    uniqueTestsPassed: number; totalTests: number;
  }[];
  disciplineStats: {
    graphTheory:         { id: string; fullName: string; email: string; avatarUrl: string | null; scorePercent: number; allPassed: number; allFailed: number; uniqueTestsTouched: number; totalTests: number }[];
    numericalMethods:    { id: string; fullName: string; email: string; avatarUrl: string | null; scorePercent: number; allPassed: number; allFailed: number; uniqueTestsTouched: number; totalTests: number }[];
    optimizationMethods: { id: string; fullName: string; email: string; avatarUrl: string | null; scorePercent: number; allPassed: number; allFailed: number; uniqueTestsTouched: number; totalTests: number }[];
  };
  testStats: {
    id: string;
    title: string;
    titleUk: string | null;
    lessonTitle: string;
    lessonTitleUk: string | null;
    courseTitle: string;
    courseTitleUk: string | null;
    passed: number;
    failed: number;
    total: number;
    passRate: number | null;
  }[];
  generatedAt: string;
}

export default function AdminStatsPage() {
  const { t, locale } = useT();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [range, setRange]   = useState<'7' | '30'>('7');

  type SuccessCol  = 'scorePercent' | 'passed' | 'failed' | 'uniqueTestsPassed' | 'fullName';
  type TestCol     = 'passRate' | 'passed' | 'failed' | 'total' | 'title';
  type CourseCol   = 'completionRate' | 'enrolled' | 'completed' | 'title';
  type TopUserCol  = 'points' | 'achievementCount' | 'favoriteCategory' | 'fullName';

  const [successSort,  setSuccessSort]  = useState<{ col: SuccessCol;  dir: 'asc' | 'desc' }>({ col: 'scorePercent',   dir: 'desc' });
  const [testSort,     setTestSort]     = useState<{ col: TestCol;     dir: 'asc' | 'desc' }>({ col: 'passRate',       dir: 'asc'  });
  const [courseSort,   setCourseSort]   = useState<{ col: CourseCol;   dir: 'asc' | 'desc' }>({ col: 'completionRate', dir: 'desc' });
  const [topUserSort,  setTopUserSort]  = useState<{ col: TopUserCol;  dir: 'asc' | 'desc' }>({ col: 'points',         dir: 'desc' });

  useEffect(() => {
    setLoading(true);
    api.get<AdminStats>('/admin/stats')
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const sortedSuccessStats = useMemo(() => {
    if (!stats) return [];
    return [...stats.userSuccessStats].sort((a, b) => {
      let cmp = 0;
      switch (successSort.col) {
        case 'scorePercent':      cmp = a.scorePercent - b.scorePercent; break;
        case 'passed':            cmp = a.passed - b.passed; break;
        case 'failed':            cmp = a.failed - b.failed; break;
        case 'uniqueTestsPassed': cmp = a.uniqueTestsPassed - b.uniqueTestsPassed; break;
        case 'fullName':          cmp = a.fullName.localeCompare(b.fullName); break;
      }
      return successSort.dir === 'asc' ? cmp : -cmp;
    });
  }, [stats, successSort]);

  const sortedTestStats = useMemo(() => {
    if (!stats) return [];
    return [...stats.testStats].sort((a, b) => {
      if (testSort.col === 'passRate') {
        if (a.passRate === null && b.passRate === null) return 0;
        if (a.passRate === null) return 1;
        if (b.passRate === null) return -1;
        const cmp = a.passRate - b.passRate;
        return testSort.dir === 'asc' ? cmp : -cmp;
      }
      let cmp = 0;
      switch (testSort.col) {
        case 'passed': cmp = a.passed - b.passed; break;
        case 'failed': cmp = a.failed - b.failed; break;
        case 'total':  cmp = a.total  - b.total;  break;
        case 'title': {
          const ta = (locale === 'uk' && a.titleUk) ? a.titleUk : a.title;
          const tb = (locale === 'uk' && b.titleUk) ? b.titleUk : b.title;
          cmp = ta.localeCompare(tb);
          break;
        }
      }
      return testSort.dir === 'asc' ? cmp : -cmp;
    });
  }, [stats, testSort, locale]);

  function toggleSuccess(col: SuccessCol, defaultDir: 'asc' | 'desc' = 'desc') {
    setSuccessSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: defaultDir },
    );
  }

  const sortedCourseLeaderboard = useMemo(() => {
    if (!stats) return [];
    return [...stats.courses.leaderboard].map((c) => ({
      ...c,
      completionRate: c.enrolled > 0 ? c.completed / c.enrolled : 0,
    })).sort((a, b) => {
      let cmp = 0;
      switch (courseSort.col) {
        case 'completionRate': cmp = a.completionRate - b.completionRate; break;
        case 'enrolled':       cmp = a.enrolled - b.enrolled; break;
        case 'completed':      cmp = a.completed - b.completed; break;
        case 'title': {
          const ta = (locale === 'uk' && a.titleUk) ? a.titleUk : a.title;
          const tb = (locale === 'uk' && b.titleUk) ? b.titleUk : b.title;
          cmp = ta.localeCompare(tb);
          break;
        }
      }
      return courseSort.dir === 'asc' ? cmp : -cmp;
    });
  }, [stats, courseSort, locale]);

  function toggleTest(col: TestCol, defaultDir: 'asc' | 'desc' = 'desc') {
    setTestSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: defaultDir },
    );
  }

  function toggleCourse(col: CourseCol, defaultDir: 'asc' | 'desc' = 'desc') {
    setCourseSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: defaultDir },
    );
  }

  const sortedTopUsers = useMemo(() => {
    if (!stats) return [];
    return [...stats.topUsers].sort((a, b) => {
      let cmp = 0;
      switch (topUserSort.col) {
        case 'points':           cmp = a.points - b.points; break;
        case 'achievementCount': cmp = a.achievementCount - b.achievementCount; break;
        case 'favoriteCategory':
          cmp = (a.favoriteCategory ?? '').localeCompare(b.favoriteCategory ?? ''); break;
        case 'fullName':         cmp = a.fullName.localeCompare(b.fullName); break;
      }
      return topUserSort.dir === 'asc' ? cmp : -cmp;
    });
  }, [stats, topUserSort]);

  function toggleTopUser(col: TopUserCol, defaultDir: 'asc' | 'desc' = 'desc') {
    setTopUserSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: defaultDir },
    );
  }

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
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

      {/* ── Top users by achievement points ──────────────────── */}
      <section className="surface border border-border rounded-lg p-5">
        <h2 className="text-base font-semibold mb-1">{t('admin.stats.topUsers')}</h2>
        {stats.topUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">{t('admin.stats.noData')}</p>
        ) : (
          <div className={`overflow-x-auto${sortedTopUsers.length > 9 ? ' max-h-[432px] overflow-y-auto' : ''}`}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-right pb-2 pr-3 w-8">#</th>
                  <SortTh col="fullName" active={topUserSort.col} dir={topUserSort.dir} align="left" className="pr-4" onSort={() => toggleTopUser('fullName', 'asc')}>{t('admin.stats.colStudent')}</SortTh>
                  <SortTh col="achievementCount" active={topUserSort.col} dir={topUserSort.dir} align="center" className="px-4" onSort={() => toggleTopUser('achievementCount')}>{t('admin.stats.colAchievements')}</SortTh>
                  <SortTh col="favoriteCategory" active={topUserSort.col} dir={topUserSort.dir} align="center" className="px-4" onSort={() => toggleTopUser('favoriteCategory', 'asc')}>{t('admin.stats.colFavoriteCategory')}</SortTh>
                  <SortTh col="points" active={topUserSort.col} dir={topUserSort.dir} align="center" className="px-4" onSort={() => toggleTopUser('points')}>{t('admin.stats.colPoints')}</SortTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedTopUsers.map((u, i) => (
                  <tr key={u.id}>
                    <td className="py-2.5 pr-3 text-right text-xs font-semibold text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={u.fullName} avatarUrl={u.avatarUrl} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{u.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center tabular-nums font-semibold">{u.achievementCount}</td>
                    <td className="py-2.5 px-4 text-center">
                      {u.favoriteCategory ? (
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${categoryStyle(u.favoriteCategory)}`}>
                          {t(`admin.stats.achCat${u.favoriteCategory}`)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center font-semibold tabular-nums">
                      {u.points} <span className="text-xs font-normal text-muted-foreground">{t('admin.stats.pts')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Course completion table ───────────────────────────── */}
      <section className="surface border border-border rounded-lg p-5">
        <h2 className="text-base font-semibold mb-1">{t('admin.stats.courseLeaderboard')}</h2>
        {stats.courses.leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">{t('admin.stats.noData')}</p>
        ) : (
          <div className={`overflow-x-auto${sortedCourseLeaderboard.length > 9 ? ' max-h-[432px] overflow-y-auto' : ''}`}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-right pb-2 pr-3 w-8">#</th>
                  <SortTh col="title" active={courseSort.col} dir={courseSort.dir} align="left" className="pr-4" onSort={() => toggleCourse('title', 'asc')}>{t('admin.stats.colCourseName')}</SortTh>
                  <SortTh col="enrolled"       active={courseSort.col} dir={courseSort.dir} className="px-4" onSort={() => toggleCourse('enrolled')}>{t('admin.stats.colStarted')}</SortTh>
                  <SortTh col="completed"      active={courseSort.col} dir={courseSort.dir} className="px-4" onSort={() => toggleCourse('completed')}>{t('admin.stats.colFinished')}</SortTh>
                  <SortTh col="completionRate" active={courseSort.col} dir={courseSort.dir} className="pl-4" onSort={() => toggleCourse('completionRate')}>{t('admin.stats.colCompletionRate')}</SortTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedCourseLeaderboard.map((c, i) => {
                  const title = (locale === 'uk' && c.titleUk) ? c.titleUk : c.title;
                  const pct = Math.round(c.completionRate * 100);
                  return (
                    <tr key={c.id}>
                      <td className="py-2.5 pr-3 text-right text-xs font-semibold text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-medium">{title}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-muted-foreground">{c.enrolled}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-muted-foreground">{c.completed}</td>
                      <td className="py-2.5 pl-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-semibold tabular-nums">{pct}%</span>
                          <div className="w-16 h-1.5 bg-muted rounded overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Student success rates (full-width table) ─────────── */}
      <section className="surface border border-border rounded-lg p-5">
        <h2 className="text-base font-semibold mb-1">{t('admin.stats.userSuccessTitle')}</h2>
        <p className="text-xs text-muted-foreground mb-4">{t('admin.stats.userSuccessSubtitle')}</p>
        {stats.userSuccessStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('admin.stats.noData')}</p>
        ) : (
          <div className={`overflow-x-auto${stats.userSuccessStats.length > 9 ? ' max-h-[432px] overflow-y-auto' : ''}`}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-right pb-2 pr-3 w-8">#</th>
                  <SortTh col="fullName" active={successSort.col} dir={successSort.dir} align="left" className="pr-4" onSort={() => toggleSuccess('fullName', 'asc')}>{t('admin.stats.colStudent')}</SortTh>
                  <SortTh col="scorePercent" active={successSort.col} dir={successSort.dir} className="px-4" onSort={() => toggleSuccess('scorePercent')}>{t('admin.stats.colScore')}</SortTh>
                  <SortTh col="passed" active={successSort.col} dir={successSort.dir} className="px-4" onSort={() => toggleSuccess('passed')}>{t('admin.stats.colPassed')}</SortTh>
                  <SortTh col="failed" active={successSort.col} dir={successSort.dir} className="px-4" onSort={() => toggleSuccess('failed')}>{t('admin.stats.colFailed')}</SortTh>
                  <SortTh col="uniqueTestsPassed" active={successSort.col} dir={successSort.dir} className="pl-4" onSort={() => toggleSuccess('uniqueTestsPassed')}>{t('admin.stats.colTests')}</SortTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedSuccessStats.map((u, i) => (
                  <tr key={u.id}>
                    <td className="py-2.5 pr-3 text-right text-xs font-semibold text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={u.fullName} avatarUrl={u.avatarUrl} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{u.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <p className="font-semibold tabular-nums">{u.scorePercent}%</p>
                      <div className="w-20 h-1.5 bg-muted rounded overflow-hidden mt-1 ml-auto">
                        <div className="h-full bg-blue-500" style={{ width: `${u.scorePercent}%` }} />
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">{u.passed}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="text-rose-600 dark:text-rose-400 font-semibold tabular-nums">{u.failed}</span>
                    </td>
                    <td className="py-2.5 pl-4 text-right tabular-nums text-muted-foreground">
                      {u.uniqueTestsPassed}&nbsp;/&nbsp;{u.totalTests}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Discipline success rates (3 columns, per user) ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(
          [
            ['graphTheory',         t('admin.stats.disciplineGraphTheory')],
            ['numericalMethods',    t('admin.stats.disciplineNumericalMethods')],
            ['optimizationMethods', t('admin.stats.disciplineOptimizationMethods')],
          ] as [keyof typeof stats.disciplineStats, string][]
        ).map(([key, label]) => {
          const users = stats.disciplineStats[key];
          return (
            <section key={key} className="surface border border-border rounded-lg p-5">
              <h2 className="text-base font-semibold mb-1">{label}</h2>
              <p className="text-xs text-muted-foreground mb-4">{t('admin.stats.disciplineSubtitle')}</p>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('admin.stats.disciplineNoData')}</p>
              ) : (
                <div className={users.length > 5 ? 'max-h-[396px] overflow-y-auto pr-1' : ''}>
                <ul className="space-y-3">
                  {users.map((u, i) => (
                    <li key={u.id} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums w-5 shrink-0 text-center self-center">{i + 1}</span>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <UserAvatar name={u.fullName} avatarUrl={u.avatarUrl} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{u.fullName}</p>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold tabular-nums shrink-0">{u.scorePercent}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${u.scorePercent}%` }} />
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                            {u.allPassed} {t('admin.stats.legendPassed').toLowerCase()}
                          </span>
                          <span className="text-rose-600 dark:text-rose-400 font-medium tabular-nums">
                            {u.allFailed} {t('admin.stats.legendFailed').toLowerCase()}
                          </span>
                          <span className="ml-auto text-muted-foreground tabular-nums">
                            {u.uniqueTestsTouched}/{u.totalTests} {t('admin.stats.testsLabel')}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* ── Test performance table ───────────────────────────── */}
      <section className="surface border border-border rounded-lg p-5">
        <h2 className="text-base font-semibold mb-1">{t('admin.stats.testStatsTitle')}</h2>
        <p className="text-xs text-muted-foreground mb-4">{t('admin.stats.testStatsSubtitle')}</p>
        {stats.testStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('admin.stats.noData')}</p>
        ) : (
          <div className={`overflow-x-auto${stats.testStats.length > 9 ? ' max-h-[432px] overflow-y-auto' : ''}`}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-right pb-2 pr-3 w-8">#</th>
                  <SortTh col="title" active={testSort.col} dir={testSort.dir} align="left" className="pr-4" onSort={() => toggleTest('title', 'asc')}>{t('admin.stats.colTestName')}</SortTh>
                  <th className="text-left pb-2 pr-4">{t('admin.stats.colCourse')}</th>
                  <SortTh col="total" active={testSort.col} dir={testSort.dir} className="px-4" onSort={() => toggleTest('total')}>{t('admin.stats.colTotal')}</SortTh>
                  <SortTh col="passed" active={testSort.col} dir={testSort.dir} className="px-4" onSort={() => toggleTest('passed')}>{t('admin.stats.colPassed')}</SortTh>
                  <SortTh col="failed" active={testSort.col} dir={testSort.dir} className="px-4" onSort={() => toggleTest('failed')}>{t('admin.stats.colFailed')}</SortTh>
                  <SortTh col="passRate" active={testSort.col} dir={testSort.dir} className="pl-4" onSort={() => toggleTest('passRate', 'asc')}>{t('admin.stats.colPassRate')}</SortTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedTestStats.map((test, i) => {
                  const testTitle   = (locale === 'uk' && test.titleUk)       ? test.titleUk       : test.title;
                  const lessonTitle = (locale === 'uk' && test.lessonTitleUk) ? test.lessonTitleUk : test.lessonTitle;
                  const courseTitle = (locale === 'uk' && test.courseTitleUk) ? test.courseTitleUk : test.courseTitle;
                  const pct = test.passRate !== null ? Math.round(test.passRate * 100) : null;
                  return (
                    <tr key={test.id}>
                      <td className="py-2.5 pr-3 text-right text-xs font-semibold text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="py-2.5 pr-4">
                        <p className="font-medium truncate">{testTitle}</p>
                        <p className="text-xs text-muted-foreground truncate">{lessonTitle}</p>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{courseTitle}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-muted-foreground">{test.total}</td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">{test.passed}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="text-rose-600 dark:text-rose-400 font-semibold tabular-nums">{test.failed}</span>
                      </td>
                      <td className="py-2.5 pl-4 text-right">
                        {pct !== null ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-semibold tabular-nums">{pct}%</span>
                            <div className="w-16 h-1.5 bg-muted rounded overflow-hidden">
                              <div
                                className={`h-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-rose-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[11px] text-muted-foreground">
        {t('admin.stats.generatedAt', { time: new Date(stats.generatedAt).toLocaleString() })}
      </p>
    </div>
  );
}

// ── Achievement category badge colour ────────────────────────
function categoryStyle(cat: string): string {
  switch (cat) {
    case 'PROGRESS': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    case 'SKILL':    return 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400';
    case 'STREAK':   return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    case 'SOCIAL':   return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    default:         return 'bg-muted text-muted-foreground';
  }
}

// ── User avatar ──────────────────────────────────────────────
function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
      {avatarUrl
        ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        : <span className="text-xs font-semibold">{name.charAt(0).toUpperCase()}</span>}
    </div>
  );
}

// ── Sortable column header ────────────────────────────────────
function SortTh({
  col, active, dir, align = 'right', className = '', onSort, children,
}: {
  col: string;
  active: string;
  dir: 'asc' | 'desc';
  align?: 'left' | 'right' | 'center';
  className?: string;
  onSort: () => void;
  children: React.ReactNode;
}) {
  const isActive = active === col;
  const Icon = isActive ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : '';
  return (
    <th
      className={`cursor-pointer select-none pb-2 ${alignClass} ${className}`}
      onClick={onSort}
    >
      <span className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${isActive ? 'text-foreground' : ''} ${justifyClass}`}>
        {align === 'left' && <Icon className={`h-3 w-3 shrink-0 ${isActive ? 'opacity-100' : 'opacity-40'}`} />}
        {children}
        {(align === 'right' || align === 'center') && <Icon className={`h-3 w-3 shrink-0 ${isActive ? 'opacity-100' : 'opacity-40'}`} />}
      </span>
    </th>
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

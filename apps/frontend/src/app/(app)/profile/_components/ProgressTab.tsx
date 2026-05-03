'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import type { CourseProgress } from './types';

/**
 * "Progress" tab: per-course list (enrolled first, then not-enrolled), each
 * card shows status pill, percent, lessons/tests counts, and earned marks.
 * Fetches its data on mount — the page only renders this when its tab is
 * active so we get fresh data each visit.
 */
export function ProgressTab() {
  const { user } = useAuth();
  const { t, locale } = useT();

  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProgressLoading(true);
    api
      .get<CourseProgress[]>(`/users/${user.id}/course-progress`)
      .then(setCourseProgress)
      .catch(() => {})
      .finally(() => setProgressLoading(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="space-y-1 mb-2">
        <h2 className="text-base font-semibold text-foreground">{t('profile.progress.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('profile.progress.subtitle')}</p>
      </div>

      {progressLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-lg" />
          ))}
        </div>
      ) : courseProgress.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('profile.progress.empty')}</p>
      ) : (
        [...courseProgress]
          .sort((a, b) => {
            // Enrolled (in-progress / completed) first, then not-enrolled
            const rank = (s: CourseProgress['status']) =>
              s === 'IN_PROGRESS' ? 0 : s === 'COMPLETED' ? 1 : 2;
            return rank(a.status) - rank(b.status);
          })
          .map((c) => {
          const title = (locale === 'uk' && c.titleUk) ? c.titleUk : c.title;
          const discipline = (locale === 'uk' && c.disciplineUk) ? c.disciplineUk : c.discipline;
          const statusKey =
            c.status === 'COMPLETED' ? 'completed' :
            c.status === 'IN_PROGRESS' ? 'inProgress' :
            'notEnrolled';
          const statusStyle =
            c.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            c.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            'bg-muted text-muted-foreground';

          return (
            <Link
              key={c.courseId}
              href={`/courses/${c.courseId}`}
              className={`surface-interactive block p-5 space-y-3 ${c.status === 'NOT_ENROLLED' ? 'opacity-70' : ''}`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                      {discipline}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyle}`}>
                      {t(`profile.progress.${statusKey}`)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
                </div>
                <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums shrink-0">
                  {c.status === 'NOT_ENROLLED' ? '—' : `${Math.round(c.progressPercent)}%`}
                </span>
              </div>

              {/* Progress bar — only when enrolled */}
              {c.status !== 'NOT_ENROLLED' && (
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      c.status === 'COMPLETED' ? 'bg-green-500' : 'bg-foreground'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, c.progressPercent))}%` }}
                  />
                </div>
              )}

              {/* Counts */}
              <div className="flex items-center justify-between text-xs text-muted-foreground gap-3 flex-wrap">
                <span>
                  <span className="text-foreground font-medium">{t('profile.progress.lessons')}:</span>{' '}
                  {t('profile.progress.lessonsProgress', { done: c.completedLessons, total: c.totalLessons })}
                </span>
                <span>
                  <span className="text-foreground font-medium">{t('profile.progress.tests')}:</span>{' '}
                  {t('profile.progress.testsProgress', { done: c.passedTests, total: c.totalTests })}
                </span>
              </div>

              {/* Marks: sum of best test scores / total possible across the course */}
              {c.maxMarks > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    <span className="text-foreground font-medium">{t('profile.progress.marks')}:</span>{' '}
                    <span className="tabular-nums">
                      {t('profile.progress.marksProgress', { earned: c.earnedMarks, total: c.maxMarks })}
                    </span>
                  </span>
                </div>
              )}

              {c.status === 'NOT_ENROLLED' && (
                <p className="text-[11px] text-muted-foreground italic">
                  {t('profile.progress.browseCourse')} →
                </p>
              )}
            </Link>
          );
        })
      )}
    </div>
  );
}

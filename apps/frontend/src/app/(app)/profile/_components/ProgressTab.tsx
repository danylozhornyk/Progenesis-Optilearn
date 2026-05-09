'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import type { CourseProgress } from './types';

/**
 * "Progress" tab: per-course list (enrolled first, then not-enrolled), each
 * card shows status pill, percent, lessons/tests counts, earned marks, and
 * for completed courses a "Request Certificate" button that emails the PDF.
 */
export function ProgressTab() {
  const { user } = useAuth();
  const { t, locale } = useT();

  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  // courseId → 'idle' | 'loading' | 'sent' | 'error'
  const [certState, setCertState] = useState<Record<string, 'idle' | 'loading' | 'sent' | 'error'>>({});

  useEffect(() => {
    if (!user) return;
    setProgressLoading(true);
    api
      .get<CourseProgress[]>(`/users/${user.id}/course-progress`)
      .then(setCourseProgress)
      .catch(() => {})
      .finally(() => setProgressLoading(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function requestCertificate(e: React.MouseEvent, courseId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!user || certState[courseId] === 'loading' || certState[courseId] === 'sent') return;

    setCertState((s) => ({ ...s, [courseId]: 'loading' }));
    try {
      await api.post(`/users/${user.id}/certificate/${courseId}`, {});
      setCertState((s) => ({ ...s, [courseId]: 'sent' }));
    } catch {
      setCertState((s) => ({ ...s, [courseId]: 'error' }));
    }
  }

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
          .sort((a, b) => b.progressPercent - a.progressPercent)
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

            const cs = certState[c.courseId] ?? 'idle';

            return (
              <div key={c.courseId} className="space-y-0">
                <Link
                  href={`/courses/${c.courseId}`}
                  className={`surface-interactive block p-5 space-y-3 ${
                    c.status === 'COMPLETED' ? 'rounded-t-lg rounded-b-none' : ''
                  } ${c.status === 'NOT_ENROLLED' ? 'opacity-70' : ''}`}
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

                  {/* Marks + success rate */}
                  {c.maxMarks > 0 && c.status !== 'NOT_ENROLLED' && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground gap-3 flex-wrap">
                      <span>
                        <span className="text-foreground font-medium">{t('profile.progress.marks')}:</span>{' '}
                        <span className="tabular-nums">
                          {t('profile.progress.marksProgress', { earned: c.earnedMarks, total: c.maxMarks })}
                        </span>
                      </span>
                      {c.attemptedMaxMarks > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="text-foreground font-medium">{t('profile.progress.successRate')}:</span>
                          {(() => {
                            const rate = Math.round((c.earnedMarks / c.attemptedMaxMarks) * 100);
                            const color =
                              rate >= 80 ? 'text-green-600 dark:text-green-400' :
                              rate >= 50 ? 'text-amber-600 dark:text-amber-400' :
                                           'text-red-500 dark:text-red-400';
                            return (
                              <span className={`tabular-nums font-semibold ${color}`}>
                                {rate}%
                              </span>
                            );
                          })()}
                        </span>
                      )}
                    </div>
                  )}

                  {c.status === 'NOT_ENROLLED' && (
                    <p className="text-[11px] text-muted-foreground italic">
                      {t('profile.progress.browseCourse')} →
                    </p>
                  )}
                </Link>

                {/* Certificate button — only for completed courses */}
                {c.status === 'COMPLETED' && (
                  user?.isEmailVerified === false ? (
                    <div className="w-full flex items-center gap-2.5 px-4 py-2.5
                                    bg-amber-50 border border-t-0 border-amber-200 rounded-b-lg
                                    dark:bg-amber-900/20 dark:border-amber-800">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
                           className="shrink-0 text-amber-600 dark:text-amber-400">
                        <path d="M8 1.5L1 13.5h14L8 1.5Z" stroke="currentColor" strokeWidth="1.5"
                              strokeLinejoin="round"/>
                        <path d="M8 6v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5"
                              strokeLinecap="round"/>
                      </svg>
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        {t('profile.progress.certificate.unverifiedEmail')}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => requestCertificate(e, c.courseId)}
                      disabled={cs === 'loading' || cs === 'sent'}
                      className={`
                        w-full flex items-center justify-center gap-2
                        px-4 py-2.5 text-xs font-semibold rounded-b-lg
                        border border-t-0 transition-all
                        ${cs === 'sent'
                          ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 cursor-default'
                          : cs === 'error'
                            ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 cursor-pointer'
                        }
                      `}
                    >
                      {cs === 'loading' ? (
                        <>
                          <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          {t('profile.progress.certificate.sending')}
                        </>
                      ) : cs === 'sent' ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {t('profile.progress.certificate.sent')}
                        </>
                      ) : cs === 'error' ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                          {t('profile.progress.certificate.retry')}
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M5 5h6M5 8h6M5 11h3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                            <path d="M10 10.5l1.5 1.5L14 9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {t('profile.progress.certificate.request')}
                        </>
                      )}
                    </button>
                  )
                )}
              </div>
            );
          })
      )}
    </div>
  );
}

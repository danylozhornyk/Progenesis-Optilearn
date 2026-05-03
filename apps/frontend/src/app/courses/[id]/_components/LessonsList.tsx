'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { ClockIcon, LockIcon } from './icons';
import type { Lesson, LessonAccess } from './types';

/**
 * Renders the course's lesson list. Handles three per-row visual states:
 *   - locked  → non-clickable card, shows "{n} previous lessons" hint
 *   - passed  → green "Completed" pill
 *   - unlocked / in-progress → clickable card with progress count
 *
 * `userLoggedIn` controls whether the lock-gate applies — anonymous users
 * can browse all lessons.
 */
export function LessonsList({
  courseId,
  lessons,
  accessByLesson,
  userLoggedIn,
}: {
  courseId: string;
  lessons: Lesson[];
  accessByLesson: Map<string, LessonAccess>;
  userLoggedIn: boolean;
}) {
  const { t, locale } = useT();

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">
        {t('courses.lessonsTitle')}
      </h2>

      <div className="space-y-2">
        {lessons.map((lesson, idx) => {
          const lessonTitle = (locale === 'uk' && lesson.titleUk) ? lesson.titleUk : lesson.title;
          const access = accessByLesson.get(lesson.id);
          // For unauthenticated users: don't apply gate, all lessons are visitable
          const isLocked = userLoggedIn ? (access ? !access.unlocked : false) : false;
          const isPassed = access?.allTestsPassed && access.testCount > 0;
          const prevLessonIndex = idx > 0 ? lessons[idx - 1].orderIndex : null;

          // Status badge
          let statusBadge: React.ReactNode = null;
          if (isLocked) {
            statusBadge = (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                <LockIcon />
                {t('lesson.locked')}
              </span>
            );
          } else if (isPassed) {
            statusBadge = (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
                {t('lesson.completed')}
              </span>
            );
          } else if (access && access.testCount > 0) {
            statusBadge = (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                {t('lesson.progressPassed', { passed: access.passedTestCount, total: access.testCount })}
              </span>
            );
          }

          const sharedInner = (
            <>
              {/* Index */}
              <span className="w-6 text-center text-xs font-medium text-muted-foreground shrink-0">
                {lesson.orderIndex}
              </span>

              {/* Title + hint */}
              <span className="flex-1 min-w-0">
                <span className={`block text-sm font-medium truncate ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {lessonTitle}
                </span>
                {isLocked && prevLessonIndex !== null && (
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    {t('lesson.lockedHint', { n: prevLessonIndex })}
                  </span>
                )}
              </span>

              {/* Right side */}
              <div className="flex items-center gap-3 shrink-0">
                {statusBadge}
                {lesson.estimatedMinutes && (
                  <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                    <ClockIcon />
                    {lesson.estimatedMinutes}m
                  </span>
                )}
                {!lesson.isMandatory && !isLocked && !isPassed && <LockIcon />}
                {!isLocked && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground opacity-50">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                )}
              </div>
            </>
          );

          if (isLocked) {
            return (
              <div
                key={lesson.id}
                aria-disabled="true"
                title={prevLessonIndex !== null ? t('lesson.lockedHint', { n: prevLessonIndex }) : t('lesson.lockedTitle')}
                className="surface flex items-center gap-4 px-4 py-3 opacity-60 cursor-not-allowed"
              >
                {sharedInner}
              </div>
            );
          }

          return (
            <Link
              key={lesson.id}
              href={`/courses/${courseId}/lessons/${lesson.id}`}
              className="surface-interactive flex items-center gap-4 px-4 py-3"
            >
              {sharedInner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { ClockIcon, MandatoryIcon, OptionalIcon } from './icons';
import type { Lesson, LessonAccess } from './types';

/**
 * Renders the course's lesson list. All lessons are always clickable.
 * Status badges reflect test completion only:
 *   - passed  → green "Completed" pill
 *   - in-progress → progress count pill
 */
export function LessonsList({
  courseId,
  lessons,
  accessByLesson,
}: {
  courseId: string;
  lessons: Lesson[];
  accessByLesson: Map<string, LessonAccess>;
}) {
  const { t, locale } = useT();

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">
        {t('courses.lessonsTitle')}
      </h2>

      <div className="space-y-2">
        {lessons.map((lesson) => {
          const lessonTitle = (locale === 'uk' && lesson.titleUk) ? lesson.titleUk : lesson.title;
          const access = accessByLesson.get(lesson.id);
          const isPassed = access?.allTestsPassed && access.testCount > 0;

          // Status badge
          let statusBadge: React.ReactNode = null;
          if (isPassed) {
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

          return (
            <Link
              key={lesson.id}
              href={`/courses/${courseId}/lessons/${lesson.id}`}
              className="surface-interactive flex items-center gap-4 px-4 py-3"
            >
              {/* Index */}
              <span className="w-6 text-center text-xs font-medium text-muted-foreground shrink-0">
                {lesson.orderIndex}
              </span>

              {/* Title */}
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium truncate text-foreground">
                  <span title={lesson.isMandatory ? t('lesson.mandatory') : t('lesson.optional')} className="shrink-0">
                    {lesson.isMandatory ? <MandatoryIcon /> : <OptionalIcon />}
                  </span>
                  {lessonTitle}
                </span>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground opacity-50">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

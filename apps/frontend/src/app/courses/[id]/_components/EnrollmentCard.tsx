'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';
import type { Course, Enrollment, LessonAccess } from './types';

/**
 * Enrollment block shown to logged-in users:
 *   - if not enrolled → an enroll button
 *   - if enrolled    → percent + bar, "Continue learning" (jumps to the next
 *     lesson the user actually needs to do, not lesson #1) and a
 *     "Leave course" button.
 */
export function EnrollmentCard({
  course,
  enrollment,
  enrollSubmitting,
  onEnroll,
  onUnenroll,
  accessByLesson,
}: {
  course: Course;
  enrollment: Enrollment;
  enrollSubmitting: boolean;
  onEnroll: () => void;
  onUnenroll: () => void;
  accessByLesson: Map<string, LessonAccess>;
}) {
  const { t } = useT();

  const percent = Math.round(enrollment.progressPercent ?? 0);
  const completed = enrollment.enrolled && percent >= 100;

  // "Continue learning" should land on the next lesson the user actually
  // needs to do, not lesson #1 every time. Pick the earliest lesson that is
  // unlocked AND not yet completed (no tests yet passed, or some still
  // pending).
  //
  //   - If access data is still loading → fall back to lesson #1.
  //   - If every lesson has been completed → land on the last lesson (so
  //     the user can review).
  const accessLoaded = accessByLesson.size > 0;
  let nextLesson = course.lessons[0] ?? null;

  if (accessLoaded) {
    const pending = course.lessons.find((l) => {
      const a = accessByLesson.get(l.id);
      return a ? a.unlocked && !a.allTestsPassed : false;
    });
    nextLesson = pending ?? course.lessons[course.lessons.length - 1] ?? null;
  }

  const continueHref = nextLesson
    ? `/courses/${course.id}/lessons/${nextLesson.id}`
    : null;

  return (
    <div className="surface p-5 space-y-3">
      {enrollment.enrolled ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {completed
                ? t('courses.courseCompleted')
                : t('courses.enrolledOn', { percent })}
            </p>
            <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
              {percent}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${completed ? 'bg-green-500' : 'bg-foreground'}`}
              style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {continueHref && !completed && (
              <Link
                href={continueHref}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
              >
                {t('courses.continueLearning')}
              </Link>
            )}
            <button
              type="button"
              onClick={onUnenroll}
              className="inline-flex items-center px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {t('courses.leaveCourse')}
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={onEnroll}
          disabled={enrollSubmitting}
          className="w-full inline-flex items-center justify-center px-3 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {enrollSubmitting ? t('courses.enrolling') : t('courses.enroll')}
        </button>
      )}
    </div>
  );
}

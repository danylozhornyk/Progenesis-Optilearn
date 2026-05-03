'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

/**
 * Yellow "lesson is locked" banner shown when the user hasn't passed every
 * test in the previous mandatory lesson. Includes a deep-link to the
 * blocking lesson when known.
 */
export function LockedBanner({
  courseId,
  blockingLessonId,
}: {
  courseId: string;
  blockingLessonId: string | null;
}) {
  const { t } = useT();

  return (
    <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-700 dark:text-yellow-400">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
          {t('lesson.lockedTitle')}
        </p>
      </div>
      <p className="text-xs text-yellow-800 dark:text-yellow-300/90 leading-relaxed">
        {t('lesson.lockedDescription')}
      </p>
      {blockingLessonId && (
        <Link
          href={`/courses/${courseId}/lessons/${blockingLessonId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-900 dark:text-yellow-200 underline underline-offset-2 hover:no-underline"
        >
          {t('lesson.goToBlocking')}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </Link>
      )}
    </div>
  );
}

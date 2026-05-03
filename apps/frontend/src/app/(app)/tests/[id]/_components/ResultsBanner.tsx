'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { CheckIcon, XIcon } from './icons';
import type { SubmissionResult } from './types';

/**
 * Pass / fail banner shown after submission. Includes new-achievement chips,
 * a try-again button (unless `lockRetry`) and a back-to-lesson link.
 */
export function ResultsBanner({
  result,
  onRetry,
  courseId,
  lessonId,
  lockRetry,
}: {
  result: SubmissionResult;
  onRetry: () => void;
  courseId: string;
  lessonId: string;
  /** When true, hides the Try-again button (e.g. user has already passed). */
  lockRetry: boolean;
}) {
  const { t, locale } = useT();
  const { submission } = result;
  const passed = submission.passed;

  return (
    <div className={`rounded-lg p-5 space-y-3 ${
      passed
        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
    }`}>
      <div className="flex items-center gap-3">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
          passed ? 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300' : 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300'
        }`}>
          {passed ? <CheckIcon /> : <XIcon />}
        </span>
        <div>
          <p className={`text-sm font-semibold ${passed ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
            {passed ? t('test.passed') : t('test.failed')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('test.score', { score: submission.totalScore, max: submission.maxScore })}{' '}
            · {t('test.percent', { pct: Math.round(submission.percentScore) })}
          </p>
        </div>
      </div>

      {result.newAchievements.length > 0 && (
        <p className="text-xs text-muted-foreground">
          🏆 {result.newAchievements.map((a) => (locale === 'uk' && a.nameUk) ? a.nameUk : a.name).join(', ')}
        </p>
      )}

      {lockRetry && (
        <p className="text-xs text-green-800 dark:text-green-300/90 italic">
          {t('test.alreadyPassedNotice')}
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        {!lockRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 rounded-md border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            {t('test.tryAgain')}
          </button>
        )}
        <Link
          href={`/courses/${courseId}/lessons/${lessonId}`}
          className="px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
        >
          {t('test.backToLesson')}
        </Link>
      </div>
    </div>
  );
}

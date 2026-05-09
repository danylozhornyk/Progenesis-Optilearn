'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { CheckIcon, XIcon } from './icons';
import type { SubmissionResult } from './types';

function getCoefficient(attemptNumber: number) {
  if (attemptNumber === 1) return 1.0;
  if (attemptNumber === 2) return 0.8;
  return 0.6;
}

/**
 * Pass / fail banner shown after submission. Handles three visual states:
 * passed (green), failed with retries remaining (red), attempts exhausted (amber).
 */
export function ResultsBanner({
  result,
  onRetry,
  courseId,
  lessonId,
  lockRetry,
  maxAttempts,
  attemptsExhausted,
}: {
  result: SubmissionResult;
  onRetry: () => void;
  courseId: string;
  lessonId: string;
  lockRetry: boolean;
  maxAttempts: number | null;
  attemptsExhausted: boolean;
}) {
  const { t, locale } = useT();
  const { submission } = result;
  const passed = submission.passed;
  const coefficient = getCoefficient(submission.attemptNumber);

  // Visual state
  const isExhausted = attemptsExhausted && !passed;
  const colorClass = isExhausted
    ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
    : passed
    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800';

  const iconColorClass = isExhausted
    ? 'bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300'
    : passed
    ? 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300'
    : 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300';

  const labelColorClass = isExhausted
    ? 'text-amber-800 dark:text-amber-300'
    : passed
    ? 'text-green-800 dark:text-green-300'
    : 'text-red-800 dark:text-red-300';

  const statusLabel = isExhausted
    ? t('test.failed')
    : passed
    ? t('test.passed')
    : t('test.failed');

  return (
    <div className={`rounded-lg p-5 space-y-3 ${colorClass}`}>
      <div className="flex items-center gap-3">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center ${iconColorClass}`}>
          {passed || isExhausted ? (isExhausted ? <XIcon /> : <CheckIcon />) : <XIcon />}
        </span>
        <div>
          <p className={`text-sm font-semibold ${labelColorClass}`}>{statusLabel}</p>
          <p className="text-xs text-muted-foreground">
            {t('test.score', { score: submission.totalScore, max: submission.maxScore })}{' '}
            · {t('test.percent', { pct: Math.round(submission.percentScore) })}
            {coefficient < 1.0 && (
              <span className="ml-2 font-medium text-amber-700 dark:text-amber-400">
                ({t('test.coefficientApplied', { coeff: coefficient })})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Attempts-exhausted notice */}
      {isExhausted && maxAttempts !== null && (
        <p className="text-xs text-amber-800 dark:text-amber-300/90">
          {t('test.attemptsExhausted', { max: maxAttempts })}
        </p>
      )}

      {result.newAchievements.length > 0 && (
        <p className="text-xs text-muted-foreground">
          🏆 {result.newAchievements.map((a) => (locale === 'uk' && a.nameUk) ? a.nameUk : a.name).join(', ')}
        </p>
      )}

      {lockRetry && !isExhausted && (
        <p className={`text-xs ${labelColorClass} italic`}>
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

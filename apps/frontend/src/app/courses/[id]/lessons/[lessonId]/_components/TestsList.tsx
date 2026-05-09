'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';
import type { Test, MySubmission } from './types';

const fmt = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');

/**
 * Tests-tab body. For each test renders a card with its meta and the right
 * action chip:
 *   - has submission + passed  → green "Passed · score/max" link
 *   - has submission, not yet  → amber "N% · score/max" link (best result)
 *   - no submission            → muted "No attempts yet" label + Start test link
 *   - lesson locked            → grey "Locked" pill, non-clickable
 */
export function TestsList({
  tests,
  userLoggedIn,
  isLocked,
  submissions,
}: {
  tests: Test[];
  userLoggedIn: boolean;
  isLocked: boolean;
  submissions: Record<string, MySubmission>;
}) {
  const { t, locale } = useT();

  if (tests.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('lesson.noTests')}</p>;
  }

  return (
    <div className="space-y-3">
      {tests.map((test) => {
        const testTitle = (locale === 'uk' && test.titleUk) ? test.titleUk : test.title;
        const testDescription = (locale === 'uk' && test.descriptionUk) ? test.descriptionUk : test.description;
        const sub = userLoggedIn ? submissions[test.id] : undefined;

        const chip = (() => {
          if (!userLoggedIn) return null;

          if (sub?.passed) {
            return (
              <span
                title={t('test.alreadyPassedNotice')}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold cursor-default select-none tabular-nums"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
                {t('test.passed')} · {fmt(Number(sub.totalScore))}/{fmt(Number(sub.maxScore))}
              </span>
            );
          }

          if (sub) {
            return (
              <Link
                href={`/tests/${test.id}`}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors tabular-nums"
              >
                {Math.round(Number(sub.percentScore))}% · {fmt(Number(sub.totalScore))}/{fmt(Number(sub.maxScore))}
              </Link>
            );
          }

          if (isLocked) {
            return (
              <span
                title={t('lesson.lockedTestNotice')}
                className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-xs font-medium cursor-not-allowed"
              >
                {t('lesson.locked')}
              </span>
            );
          }

          return (
            <Link
              href={`/tests/${test.id}`}
              className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
            >
              {t('lesson.startTest')}
            </Link>
          );
        })();

        return (
          <div key={test.id} className="surface p-5 space-y-3">
            {/* Test header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{testTitle}</h3>
                {testDescription && (
                  <p className="text-xs text-muted-foreground">{testDescription}</p>
                )}
              </div>
              {chip}
            </div>

            {/* No-attempts note — shown only when logged in and no submission exists */}
            {userLoggedIn && !sub && !isLocked && (
              <p className="text-xs text-muted-foreground italic">{t('test.noAttempts')}</p>
            )}

            {/* Test meta */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{t('lesson.tasks', { count: test._count.tasks })}</span>
              <span>
                {test.timeLimitMin
                  ? t('lesson.timeLimit', { min: test.timeLimitMin })
                  : t('lesson.noTimeLimit')}
              </span>
              <span>{t('lesson.passing', { score: Math.round(Number(test.passingScore)) })}</span>
              <span>
                {test.maxAttempts
                  ? t('lesson.attempts', { max: test.maxAttempts })
                  : t('lesson.unlimitedAttempts')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

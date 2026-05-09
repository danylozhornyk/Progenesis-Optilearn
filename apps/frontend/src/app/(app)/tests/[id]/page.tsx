'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { useAchievementToasts } from '@/lib/achievement-toasts';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeftIcon } from './_components/icons';
import { Timer } from './_components/Timer';
import { TaskCard } from './_components/TaskCard';
import { ResultsBanner } from './_components/ResultsBanner';
import { LessonDrawer } from './_components/LessonDrawer';
import { LeaveConfirmModal } from './_components/LeaveConfirmModal';
import type {
  TestData,
  GradedAnswer,
  SubmissionResult,
  UserAnswer,
} from './_components/types';

/**
 * Test-taking page. Owns the load + submit flow and the per-task answer
 * map; rendering of individual cards / results / timer lives in _components/.
 */
export default function TestPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useT();
  const router = useRouter();
  const { push: pushToasts } = useAchievementToasts();

  const [test, setTest] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  /** True when the user already has a passing submission for this test. */
  const [alreadyPassed, setAlreadyPassed] = useState(false);
  /** Number of submissions already made for this test (before the current session attempt). */
  const [priorAttemptCount, setPriorAttemptCount] = useState(0);
  /** True after the user submits their last allowed attempt without passing (promotion happened). */
  const [attemptsExhausted, setAttemptsExhausted] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  /** Href queued by the back-link click; non-null means the leave modal is open. */
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const startTime = useRef(Date.now());

  // Warn on browser refresh / tab close while the test is in progress.
  useEffect(() => {
    if (result) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [result]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<TestData>(`/tests/${id}`),
      api.get<{
        id: string;
        attemptNumber: number;
        totalScore: number | string;
        maxScore: number | string;
        percentScore: number | string;
        passed: boolean;
        answers: GradedAnswer[];
      } | null>(`/submissions/test/${id}/me`).catch(() => null),
      api.get<{ testId: string }[]>('/submissions/my').catch(() => []),
    ])
      .then(([data, mine, allSubs]) => {
        setTest(data);
        startTime.current = Date.now();

        const count = allSubs.filter((s) => s.testId === id).length;
        setPriorAttemptCount(count);

        // If the user has already passed this test, render the previous result
        // immediately so they cannot start it again.
        if (mine && mine.passed) {
          setAlreadyPassed(true);
          setResult({
            submission: {
              attemptNumber: mine.attemptNumber,
              totalScore: Number(mine.totalScore),
              maxScore: Number(mine.maxScore),
              percentScore: Number(mine.percentScore),
              passed: mine.passed,
              answers: mine.answers,
              test: { title: data.title, passingScore: Number(data.passingScore) },
            },
            newAchievements: [],
          });
        } else if (mine && data.maxAttempts !== null && count >= data.maxAttempts) {
          // All attempts used and still not passed — promotion already happened server-side.
          setAttemptsExhausted(true);
          setResult({
            submission: {
              attemptNumber: mine.attemptNumber,
              totalScore: Number(mine.totalScore),
              maxScore: Number(mine.maxScore),
              percentScore: Number(mine.percentScore),
              passed: mine.passed,
              answers: mine.answers,
              test: { title: data.title, passingScore: Number(data.passingScore) },
            },
            newAchievements: [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (!test) return;

    if (!auto) {
      const unanswered = test.tasks.some((task) => {
        const a = answers[task.id];
        if (!a) return true;
        if (a.type === 'OPEN_ANSWER') return !a.text.trim();
        if (a.type === 'MULTIPLE_CHOICE') return a.selected.length === 0;
        return false;
      });
      if (unanswered) { setValidationError(t('test.allRequired')); return; }
    }

    setValidationError('');
    setSubmitting(true);

    const payload = test.tasks.map((task) => {
      const a = answers[task.id];
      let userAnswer: Record<string, unknown> = {};
      if (a?.type === 'SINGLE_CHOICE') userAnswer = { selected: a.selected };
      else if (a?.type === 'MULTIPLE_CHOICE') userAnswer = { selected: a.selected };
      else if (a?.type === 'OPEN_ANSWER') userAnswer = { text: a.text };
      return { taskId: task.id, userAnswer };
    });

    try {
      const res = await api.post<SubmissionResult>('/submissions', {
        testId: test.id,
        answers: payload,
        timeSpentMs: Date.now() - startTime.current,
      });
      setResult(res);
      const newCount = priorAttemptCount + 1;
      setPriorAttemptCount(newCount);
      if (test.maxAttempts !== null && newCount >= test.maxAttempts && !res.submission.passed) {
        setAttemptsExhausted(true);
      }
      // Show achievement toast cards for every newly-earned badge
      if (res.newAchievements?.length) {
        pushToasts(res.newAchievements);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error');
      if (msg === 'LESSON_LOCKED') {
        setValidationError(t('lesson.lockedTestNotice'));
      } else if (msg === 'TEST_ALREADY_PASSED') {
        setValidationError(t('test.alreadyPassedNotice'));
        // Belt-and-suspenders: lock retry on the client too.
        setAlreadyPassed(true);
      } else {
        setValidationError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }, [test, answers, t]);

  const handleTimerExpire = useCallback(() => {
    setTimedOut(true);
    handleSubmit(true);
  }, [handleSubmit]);

  function handleRetry() {
    if (alreadyPassed || attemptsExhausted) return;
    setResult(null);
    setAnswers({});
    setTimedOut(false);
    setValidationError('');
    startTime.current = Date.now();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 space-y-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-7 bg-muted rounded w-2/3" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </main>
        <Footer />
      </div>
    );
  }

  if (!test) return null;

  const nextAttemptNumber = priorAttemptCount + 1;
  const nextCoefficient = nextAttemptNumber === 1 ? 1.0 : nextAttemptNumber === 2 ? 0.8 : 0.6;
  const isLastAttempt = test.maxAttempts !== null && nextAttemptNumber >= test.maxAttempts;

  const gradedMap = result
    ? new Map(result.submission.answers.map((a) => [a.taskId, a]))
    : null;

  const testTitle = (locale === 'uk' && test.titleUk) ? test.titleUk : test.title;
  const testDescription = (locale === 'uk' && test.descriptionUk) ? test.descriptionUk : test.description;
  const lessonTitle = (locale === 'uk' && test.lesson.titleUk) ? test.lesson.titleUk : test.lesson.title;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 animate-fade-in">

        {/* Back link + sticky open-lesson button */}
        {test.lesson && (
          <div className="flex items-center justify-between gap-3 mb-6 sticky top-14 z-20 bg-background/90 backdrop-blur-sm -mx-6 px-6 py-2">
            {result ? (
              <Link
                href={`/courses/${test.lesson.course.id}/lessons/${test.lesson.id}`}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeftIcon />
                {lessonTitle}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setLeaveHref(`/courses/${test.lesson.course.id}/lessons/${test.lesson.id}`)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeftIcon />
                {lessonTitle}
              </button>
            )}
            <button
              type="button"
              onClick={() => setLessonOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
              {t('test.openLesson')}
            </button>
          </div>
        )}

        {/* Test header */}
        <div className="space-y-2 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {testTitle}
            </h1>
            {test.timeLimitMin && !result && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-xs text-muted-foreground">{t('test.timeLeft')}:</span>
                <Timer
                  key={String(timedOut)}
                  totalSeconds={test.timeLimitMin * 60}
                  onExpire={handleTimerExpire}
                />
              </div>
            )}
          </div>
          {testDescription && (
            <p className="text-sm text-muted-foreground">{testDescription}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{t('lesson.tasks', { count: test.tasks.length })}</span>
            <span>{t('lesson.passing', { score: Math.round(Number(test.passingScore)) })}</span>
            {test.maxAttempts && !result && (
              <span className="font-medium text-foreground">
                {t('test.attemptOf', { n: nextAttemptNumber, max: test.maxAttempts })}
              </span>
            )}
          </div>

          {/* Coefficient / last-attempt notices — only before submitting */}
          {!result && (
            <>
              {nextCoefficient < 1.0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t('test.coefficientNotice', { coeff: nextCoefficient })}
                </p>
              )}
              {isLastAttempt && (
                <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">
                  {t('test.lastAttemptWarning')}
                </p>
              )}
            </>
          )}
        </div>

        {/* Timed-out notice */}
        {timedOut && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-300">
            {t('test.timedOut')}
          </div>
        )}

        {/* Results banner */}
        {result && (
          <div className="mb-6">
            <ResultsBanner
              result={result}
              onRetry={handleRetry}
              courseId={test.lesson.course.id}
              lessonId={test.lesson.id}
              lockRetry={alreadyPassed || attemptsExhausted}
              maxAttempts={test.maxAttempts}
              attemptsExhausted={attemptsExhausted}
            />
          </div>
        )}

        {/* Task list */}
        <div className="space-y-4">
          {test.tasks.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              index={i}
              answer={answers[task.id]}
              onChange={(a) => setAnswers((prev) => ({ ...prev, [task.id]: a }))}
              result={gradedMap?.get(task.id)}
            />
          ))}
        </div>

        {/* Submit */}
        {!result && (
          <div className="mt-6 space-y-2">
            {validationError && (
              <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
            )}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? t('test.submitting') : t('test.submit')}
            </button>
          </div>
        )}

      </main>

      <Footer />

      <LessonDrawer
        lessonId={test.lesson.id}
        lessonTitle={lessonTitle}
        isOpen={lessonOpen}
        onClose={() => setLessonOpen(false)}
      />

      <LeaveConfirmModal
        isOpen={leaveHref !== null}
        onConfirm={() => { router.push(leaveHref!); setLeaveHref(null); }}
        onCancel={() => setLeaveHref(null)}
      />
    </div>
  );
}

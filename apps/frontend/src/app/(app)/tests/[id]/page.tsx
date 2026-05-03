'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
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
  const startTime = useRef(Date.now());

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<TestData>(`/tests/${id}`),
      api.get<{
        id: string;
        totalScore: number | string;
        maxScore: number | string;
        percentScore: number | string;
        passed: boolean;
        answers: GradedAnswer[];
      } | null>(`/submissions/test/${id}/me`).catch(() => null),
    ])
      .then(([data, mine]) => {
        setTest(data);
        startTime.current = Date.now();

        // If the user has already passed this test, render the previous result
        // immediately so they cannot start it again.
        if (mine && mine.passed) {
          setAlreadyPassed(true);
          setResult({
            submission: {
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
    if (alreadyPassed) return; // hard-block retake of a passed test
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

        {/* Back link */}
        {test.lesson && (
          <Link
            href={`/courses/${test.lesson.course.id}/lessons/${test.lesson.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeftIcon />
            {lessonTitle}
          </Link>
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
            {test.maxAttempts && (
              <span>{t('lesson.attempts', { max: test.maxAttempts })}</span>
            )}
          </div>
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
              lockRetry={alreadyPassed}
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
    </div>
  );
}

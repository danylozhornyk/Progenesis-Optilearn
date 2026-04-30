'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GraphRenderer, { type GraphData } from '@/components/GraphRenderer';

// ── Types ──────────────────────────────────────────────────────

interface Option {
  id: string;
  text: string;
}

interface Task {
  id: string;
  orderIndex: number;
  taskType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'OPEN_ANSWER';
  statement: string;
  statementUk: string | null;
  options: Option[] | null;
  optionsUk: Option[] | null;
  explanation: string | null;
  explanationUk: string | null;
  maxScore: number;
  graph:
    | (GraphData & {
        id: string;
        title: string | null;
        titleUk: string | null;
      })
    | null;
}

interface TestData {
  id: string;
  title: string;
  titleUk: string | null;
  description: string | null;
  descriptionUk: string | null;
  timeLimitMin: number | null;
  maxAttempts: number | null;
  passingScore: number;
  lesson: { id: string; title: string; titleUk: string | null; course: { id: string } };
  tasks: Task[];
}

interface GradedAnswer {
  taskId: string;
  userAnswer: Record<string, unknown>;
  isCorrect: boolean;
  score: number;
}

interface SubmissionResult {
  submission: {
    totalScore: number;
    maxScore: number;
    percentScore: number;
    passed: boolean;
    answers: GradedAnswer[];
    test: { title: string; passingScore: number };
  };
  newAchievements: { name: string; nameUk?: string | null }[];
}

type UserAnswer =
  | { type: 'SINGLE_CHOICE'; selected: string }
  | { type: 'MULTIPLE_CHOICE'; selected: string[] }
  | { type: 'OPEN_ANSWER'; text: string };

// ── Icons ──────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

// ── Timer ──────────────────────────────────────────────────────

function Timer({ totalSeconds, onExpire }: { totalSeconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0) {
      if (!expiredRef.current) { expiredRef.current = true; onExpire(); }
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const urgent = remaining <= 60;

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium tabular-nums ${urgent ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
      <ClockIcon />
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}

// ── Task card ──────────────────────────────────────────────────

function TaskCard({
  task,
  index,
  answer,
  onChange,
  result,
}: {
  task: Task;
  index: number;
  answer: UserAnswer | undefined;
  onChange: (a: UserAnswer) => void;
  result?: GradedAnswer;
}) {
  const { t, locale } = useT();
  const isCorrect = result?.isCorrect;
  const statement = (locale === 'uk' && task.statementUk) ? task.statementUk : task.statement;
  const options = (locale === 'uk' && task.optionsUk) ? task.optionsUk : task.options;
  const explanation = (locale === 'uk' && task.explanationUk) ? task.explanationUk : task.explanation;
  const graphTitle = task.graph
    ? (locale === 'uk' && task.graph.titleUk) ? task.graph.titleUk : task.graph.title
    : null;

  return (
    <div className={`surface p-5 space-y-4 ${
      result !== undefined
        ? isCorrect
          ? 'ring-1 ring-green-400 dark:ring-green-600'
          : 'ring-1 ring-red-400 dark:ring-red-600'
        : ''
    }`}>
      {/* Question header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <p className="text-xs text-muted-foreground">{t('test.question', { n: index + 1 })}</p>
          <p className="text-sm font-medium text-foreground leading-relaxed">{statement}</p>
        </div>
        {result !== undefined && (
          <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
            isCorrect ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
          }`}>
            {isCorrect ? <CheckIcon /> : <XIcon />}
          </span>
        )}
      </div>

      {/* Graph visualization */}
      {task.graph && (
        <div className="space-y-1.5">
          <GraphRenderer graph={task.graph} height={280} />
          {graphTitle && (
            <p className="text-[11px] text-muted-foreground italic text-center">
              {graphTitle}
            </p>
          )}
        </div>
      )}

      {/* Options — SINGLE_CHOICE */}
      {task.taskType === 'SINGLE_CHOICE' && options && (
        <div className="space-y-2">
          {options.map((opt) => {
            const selected = answer?.type === 'SINGLE_CHOICE' && answer.selected === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  result !== undefined
                    ? 'cursor-default'
                    : 'hover:bg-accent'
                } ${selected ? 'border-foreground bg-accent' : 'border-border'}`}
              >
                <input
                  type="radio"
                  name={`task-${task.id}`}
                  value={opt.id}
                  checked={selected}
                  disabled={result !== undefined}
                  onChange={() => onChange({ type: 'SINGLE_CHOICE', selected: opt.id })}
                  className="accent-foreground"
                />
                <span className="text-sm text-foreground">{opt.text}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* Options — MULTIPLE_CHOICE */}
      {task.taskType === 'MULTIPLE_CHOICE' && options && (
        <div className="space-y-2">
          {options.map((opt) => {
            const selectedList = answer?.type === 'MULTIPLE_CHOICE' ? answer.selected : [];
            const checked = selectedList.includes(opt.id);
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  result !== undefined ? 'cursor-default' : 'hover:bg-accent'
                } ${checked ? 'border-foreground bg-accent' : 'border-border'}`}
              >
                <input
                  type="checkbox"
                  value={opt.id}
                  checked={checked}
                  disabled={result !== undefined}
                  onChange={(e) => {
                    const prev = answer?.type === 'MULTIPLE_CHOICE' ? answer.selected : [];
                    const next = e.target.checked
                      ? [...prev, opt.id]
                      : prev.filter((id) => id !== opt.id);
                    onChange({ type: 'MULTIPLE_CHOICE', selected: next });
                  }}
                  className="accent-foreground"
                />
                <span className="text-sm text-foreground">{opt.text}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* Input — OPEN_ANSWER */}
      {task.taskType === 'OPEN_ANSWER' && (
        <input
          type="text"
          value={answer?.type === 'OPEN_ANSWER' ? answer.text : ''}
          disabled={result !== undefined}
          placeholder={t('test.openPlaceholder')}
          onChange={(e) => onChange({ type: 'OPEN_ANSWER', text: e.target.value })}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-60"
        />
      )}

      {/* Post-submission feedback */}
      {result !== undefined && (
        <div className="space-y-1 pt-2 border-t border-border">
          {!result.isCorrect && task.taskType !== 'OPEN_ANSWER' && options && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t('test.yourAnswer')}:</span>{' '}
              {(() => {
                const sel = result.userAnswer.selected;
                if (Array.isArray(sel)) {
                  return sel.map((id) => options.find((o) => o.id === id)?.text ?? id).join(', ') || '—';
                }
                return options.find((o) => o.id === String(sel))?.text ?? String(sel ?? '—');
              })()}
            </p>
          )}
          {!result.isCorrect && task.taskType === 'OPEN_ANSWER' && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t('test.yourAnswer')}:</span>{' '}
              {String(result.userAnswer.text ?? '—')}
            </p>
          )}
          {explanation && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t('test.explanation')}:</span>{' '}
              {explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Results banner ─────────────────────────────────────────────

function ResultsBanner({
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

// ── Page ───────────────────────────────────────────────────────

export default function TestPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useT();

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

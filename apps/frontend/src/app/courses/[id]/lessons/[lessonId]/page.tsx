'use client';

import 'katex/dist/katex.min.css';
import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import katex from 'katex';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ContentBlock {
  type: 'text' | 'latex';
  value: string;
}

interface Lesson {
  id: string;
  title: string;
  titleUk?: string | null;
  orderIndex: number;
  estimatedMinutes: number | null;
  isMandatory: boolean;
  content: ContentBlock[];
  contentUk?: ContentBlock[] | null;
  course: { id: string; title: string; titleUk?: string | null };
}

interface Test {
  id: string;
  title: string;
  titleUk?: string | null;
  description?: string | null;
  descriptionUk?: string | null;
  timeLimitMin?: number | null;
  maxAttempts?: number | null;
  passingScore: number;
  _count: { tasks: number };
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
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

function LatexBlock({ source }: { source: string }) {
  let html = '';
  try {
    html = katex.renderToString(source, { throwOnError: false, displayMode: true });
  } catch {
    html = `<code>${source}</code>`;
  }
  return (
    <div
      className="my-4 overflow-x-auto text-center py-3"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ContentRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === 'latex') {
          return <LatexBlock key={i} source={block.value} />;
        }
        return (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">
            {block.value}
          </p>
        );
      })}
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 bg-muted rounded w-1/3" />
      <div className="h-7 bg-muted rounded w-2/3" />
      <div className="flex gap-2">
        <div className="h-8 bg-muted rounded w-20" />
        <div className="h-8 bg-muted rounded w-20" />
      </div>
      <div className="space-y-3 pt-2">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-16 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-4/5" />
      </div>
    </div>
  );
}

type Tab = 'theory' | 'tests';

interface MySubmission {
  id: string;
  testId: string;
  totalScore: number;
  maxScore: number;
  percentScore: number;
  passed: boolean;
  submittedAt: string;
}

interface LessonAccess {
  lessonId: string;
  orderIndex: number;
  testCount: number;
  passedTestCount: number;
  allTestsPassed: boolean;
  unlocked: boolean;
  blockingLessonId: string | null;
}

export default function LessonPage() {
  const { id: courseId, lessonId } = useParams<{ id: string; lessonId: string }>();
  const { t, locale } = useT();
  const { user } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<Tab>('theory');
  const [access, setAccess] = useState<LessonAccess | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, MySubmission>>({});

  useEffect(() => {
    Promise.all([
      api.get<Lesson>(`/lessons/${lessonId}`),
      api.get<Test[]>(`/tests/lesson/${lessonId}`),
    ])
      .then(([les, tsts]) => {
        setLesson(les);
        setTests(tsts);
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [lessonId]);

  useEffect(() => {
    if (!user) {
      setAccess(null);
      setSubmissions({});
      return;
    }
    api
      .get<LessonAccess>(`/lessons/${lessonId}/access`)
      .then(setAccess)
      .catch(() => setAccess(null));
    api
      .get<Record<string, MySubmission>>(`/submissions/lesson/${lessonId}/me`)
      .then((map) => setSubmissions(map ?? {}))
      .catch(() => setSubmissions({}));
  }, [lessonId, user]);

  // Auto-enroll logged-in users when they read a lesson — idempotent.
  useEffect(() => {
    if (!user || !courseId) return;
    api.post(`/courses/${courseId}/enroll`, {}).catch(() => {});
  }, [user, courseId]);

  const isLocked = !!user && access && !access.unlocked;

  if (missing) return notFound();

  const lessonTitle = lesson
    ? (locale === 'uk' && lesson.titleUk) ? lesson.titleUk : lesson.title
    : '';
  const lessonContent = lesson
    ? ((locale === 'uk' && lesson.contentUk && lesson.contentUk.length > 0) ? lesson.contentUk : lesson.content)
    : [];
  const courseTitle = lesson
    ? (locale === 'uk' && lesson.course.titleUk) ? lesson.course.titleUk : lesson.course.title
    : '';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 animate-fade-in">

        {/* Back link */}
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeftIcon />
          {courseTitle || t('courses.title')}
        </Link>

        {loading ? (
          <LessonSkeleton />
        ) : lesson ? (
          <div className="space-y-6">

            {/* Lesson header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {t('courses.lessons', { count: lesson.orderIndex })}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  lesson.isMandatory
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {lesson.isMandatory ? t('lesson.mandatory') : t('lesson.optional')}
                </span>
                {lesson.estimatedMinutes && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ClockIcon />
                    {lesson.estimatedMinutes}m
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {lessonTitle}
              </h1>
            </div>

            {/* Locked banner */}
            {isLocked && (
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
                {access?.blockingLessonId && (
                  <Link
                    href={`/courses/${courseId}/lessons/${access.blockingLessonId}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-900 dark:text-yellow-200 underline underline-offset-2 hover:no-underline"
                  >
                    {t('lesson.goToBlocking')}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                )}
              </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-border">
              {(['theory', 'tests'] as Tab[]).map((tabKey) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setTab(tabKey)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    tab === tabKey
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(`lesson.${tabKey}`)}
                  {tabKey === 'tests' && tests.length > 0 && (
                    <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                      {tests.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Theory tab */}
            {tab === 'theory' && (
              <div className="surface p-6">
                {lessonContent && lessonContent.length > 0 ? (
                  <ContentRenderer blocks={lessonContent} />
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            )}

            {/* Tests tab */}
            {tab === 'tests' && (
              <div className="space-y-3">
                {tests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('lesson.noTests')}</p>
                ) : (
                  tests.map((test) => {
                    const testTitle = (locale === 'uk' && test.titleUk) ? test.titleUk : test.title;
                    const testDescription = (locale === 'uk' && test.descriptionUk) ? test.descriptionUk : test.description;
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
                        {user && (() => {
                          const sub = submissions[test.id];
                          const passed = sub?.passed;

                          if (passed) {
                            const earned = Number(sub.totalScore);
                            const max = Number(sub.maxScore);
                            // Trim trailing .0 / .00 for clean display.
                            const fmt = (n: number) =>
                              Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
                            return (
                              <Link
                                href={`/tests/${test.id}`}
                                title={t('test.alreadyPassedNotice')}
                                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors tabular-nums"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6 9 17l-5-5"/>
                                </svg>
                                {t('test.passed')} · {fmt(earned)}/{fmt(max)}
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
                        })()}
                      </div>

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
                  })
                )}
              </div>
            )}

          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}

'use client';

import 'katex/dist/katex.min.css';
import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeftIcon, ClockIcon } from './_components/icons';
import { ContentRenderer } from './_components/ContentRenderer';
import { LessonSkeleton } from './_components/LessonSkeleton';
import { LockedBanner } from './_components/LockedBanner';
import { TestsList } from './_components/TestsList';
import type {
  Lesson,
  Test,
  MySubmission,
  LessonAccess,
  Tab,
} from './_components/types';

/**
 * Lesson detail page. Loads the lesson + its tests, then (when logged in)
 * also fetches the access gate and the user's previous submissions. Renders
 * a tab bar with theory / tests; sub-components handle the actual content.
 */
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

  const isLocked = !!user && access != null && !access.testsUnlocked;

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

        {/* Back link — sticky below the global header */}
        <div className="sticky top-14 z-20 bg-background/90 backdrop-blur-sm -mx-6 px-6 py-2 mb-4">
          <Link
            href={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon />
            {courseTitle || t('courses.title')}
          </Link>
        </div>

        {loading ? (
          <LessonSkeleton />
        ) : lesson && lesson.course.status === 'DRAFT' ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className="space-y-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 mb-2">
                {t('courses.draftBadge')}
              </span>
              <h2 className="text-xl font-semibold text-foreground">{t('courses.draftCourseTitle')}</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t('courses.draftCourseDescription')}</p>
            </div>
          </div>
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
              <LockedBanner
                courseId={courseId}
                blockingLessonId={access?.blockingLessonId ?? null}
              />
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
              <TestsList
                tests={tests}
                userLoggedIn={!!user}
                isLocked={!!isLocked}
                submissions={submissions}
              />
            )}

          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}

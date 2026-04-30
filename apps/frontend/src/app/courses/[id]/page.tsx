'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface LessonAccess {
  lessonId: string;
  orderIndex: number;
  testCount: number;
  passedTestCount: number;
  allTestsPassed: boolean;
  unlocked: boolean;
}

interface Lesson {
  id: string;
  title: string;
  titleUk?: string | null;
  orderIndex: number;
  estimatedMinutes: number | null;
  isMandatory: boolean;
}

interface Course {
  id: string;
  title: string;
  titleUk?: string | null;
  description: string;
  descriptionUk?: string | null;
  discipline: string;
  disciplineUk?: string | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  coverImageUrl?: string | null;
  author: { id: string; fullName: string };
  lessons: Lesson[];
  createdAt: string;
}

const DIFFICULTY_STYLES: Record<Course['difficulty'], string> = {
  BEGINNER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INTERMEDIATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ADVANCED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-40">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
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

function CourseSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="w-full h-56 bg-muted rounded-lg" />
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-1/4" />
        <div className="h-7 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-3/4" />
      </div>
      <div className="space-y-2 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}

interface Enrollment {
  enrolled: boolean;
  progressPercent?: number;
  totalScore?: number;
  updatedAt?: string;
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useT();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [accessByLesson, setAccessByLesson] = useState<Map<string, LessonAccess>>(new Map());
  const [enrollment, setEnrollment] = useState<Enrollment>({ enrolled: false });
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<Course>(`/courses/${id}`)
      .then(setCourse)
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user) {
      setAccessByLesson(new Map());
      setEnrollment({ enrolled: false });
      return;
    }
    Promise.all([
      api.get<LessonAccess[]>(`/lessons/course/${id}/access`),
      api.get<Enrollment>(`/courses/${id}/enrollment`),
    ])
      .then(([access, enr]) => {
        setAccessByLesson(new Map(access.map((r) => [r.lessonId, r])));
        setEnrollment(enr);
      })
      .catch(() => {});
  }, [id, user]);

  async function handleEnroll() {
    if (!user || !course || enrollSubmitting) return;
    setEnrollSubmitting(true);
    try {
      const enr = await api.post<Enrollment>(`/courses/${course.id}/enroll`, {});
      setEnrollment(enr);
    } catch {
      // ignore – button stays in idle state
    } finally {
      setEnrollSubmitting(false);
    }
  }

  async function handleUnenroll() {
    if (!user || !course) return;
    if (!window.confirm(t('courses.leaveCourseConfirm'))) return;
    try {
      await api.delete(`/courses/${course.id}/enroll`);
      setEnrollment({ enrolled: false });
    } catch {}
  }

  if (missing) return notFound();

  const title = course
    ? (locale === 'uk' && course.titleUk) ? course.titleUk : course.title
    : '';
  const description = course
    ? (locale === 'uk' && course.descriptionUk) ? course.descriptionUk : course.description
    : '';

  const totalMinutes = course?.lessons.reduce((s, l) => s + (l.estimatedMinutes ?? 0), 0) ?? 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 animate-fade-in">

        {/* Back link */}
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeftIcon />
          {t('courses.title')}
        </Link>

        {loading ? (
          <CourseSkeleton />
        ) : course ? (
          <div className="space-y-8">

            {/* Cover image */}
            {course.coverImageUrl && (
              <div className="w-full h-56 rounded-lg overflow-hidden bg-muted">
                <img
                  src={course.coverImageUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Course header */}
            <div className="space-y-4">
              {/* Tags */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  {(locale === 'uk' && course.disciplineUk) ? course.disciplineUk : course.discipline}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_STYLES[course.difficulty]}`}>
                  {t(`courses.difficulty.${course.difficulty}`)}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <BookIcon />
                  {t('courses.lessons', { count: course.lessons.length })}
                </span>
                {totalMinutes > 0 && (
                  <span className="flex items-center gap-1.5">
                    <ClockIcon />
                    {totalHours > 0
                      ? `${totalHours}h ${remainingMinutes}m`
                      : `${totalMinutes}m`}
                  </span>
                )}
                <span>{t('courses.by', { author: course.author.fullName })}</span>
              </div>
            </div>

            {/* Enrollment block — only when logged in */}
            {user && (
              (() => {
                const percent = Math.round(enrollment.progressPercent ?? 0);
                const completed = enrollment.enrolled && percent >= 100;

                // "Continue learning" should land on the next lesson the user
                // actually needs to do, not lesson #1 every time. Pick the
                // earliest lesson that is unlocked AND not yet completed
                // (no tests yet passed, or some still pending).
                //
                //   - If access data is still loading → fall back to lesson #1.
                //   - If every lesson has been completed → land on the last
                //     lesson (so the user can review).
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
                            onClick={handleUnenroll}
                            className="inline-flex items-center px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            {t('courses.leaveCourse')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleEnroll}
                        disabled={enrollSubmitting}
                        className="w-full inline-flex items-center justify-center px-3 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                      >
                        {enrollSubmitting ? t('courses.enrolling') : t('courses.enroll')}
                      </button>
                    )}
                  </div>
                );
              })()
            )}

            {/* Lessons list */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                {t('courses.lessonsTitle')}
              </h2>

              <div className="space-y-2">
                {course.lessons.map((lesson, idx) => {
                  const lessonTitle = (locale === 'uk' && lesson.titleUk) ? lesson.titleUk : lesson.title;
                  const access = accessByLesson.get(lesson.id);
                  // For unauthenticated users: don't apply gate, all lessons are visitable
                  const isLocked = user ? (access ? !access.unlocked : false) : false;
                  const isPassed = access?.allTestsPassed && access.testCount > 0;
                  const prevLessonIndex = idx > 0 ? course.lessons[idx - 1].orderIndex : null;

                  // Status badge
                  let statusBadge: React.ReactNode = null;
                  if (isLocked) {
                    statusBadge = (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                        <LockIcon />
                        {t('lesson.locked')}
                      </span>
                    );
                  } else if (isPassed) {
                    statusBadge = (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                        {t('lesson.completed')}
                      </span>
                    );
                  } else if (access && access.testCount > 0) {
                    statusBadge = (
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                        {t('lesson.progressPassed', { passed: access.passedTestCount, total: access.testCount })}
                      </span>
                    );
                  }

                  const sharedInner = (
                    <>
                      {/* Index */}
                      <span className="w-6 text-center text-xs font-medium text-muted-foreground shrink-0">
                        {lesson.orderIndex}
                      </span>

                      {/* Title + hint */}
                      <span className="flex-1 min-w-0">
                        <span className={`block text-sm font-medium truncate ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {lessonTitle}
                        </span>
                        {isLocked && prevLessonIndex !== null && (
                          <span className="block text-[11px] text-muted-foreground mt-0.5">
                            {t('lesson.lockedHint', { n: prevLessonIndex })}
                          </span>
                        )}
                      </span>

                      {/* Right side */}
                      <div className="flex items-center gap-3 shrink-0">
                        {statusBadge}
                        {lesson.estimatedMinutes && (
                          <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                            <ClockIcon />
                            {lesson.estimatedMinutes}m
                          </span>
                        )}
                        {!lesson.isMandatory && !isLocked && !isPassed && <LockIcon />}
                        {!isLocked && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground opacity-50">
                            <path d="m9 18 6-6-6-6"/>
                          </svg>
                        )}
                      </div>
                    </>
                  );

                  if (isLocked) {
                    return (
                      <div
                        key={lesson.id}
                        aria-disabled="true"
                        title={prevLessonIndex !== null ? t('lesson.lockedHint', { n: prevLessonIndex }) : t('lesson.lockedTitle')}
                        className="surface flex items-center gap-4 px-4 py-3 opacity-60 cursor-not-allowed"
                      >
                        {sharedInner}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={lesson.id}
                      href={`/courses/${course.id}/lessons/${lesson.id}`}
                      className="surface-interactive flex items-center gap-4 px-4 py-3"
                    >
                      {sharedInner}
                    </Link>
                  );
                })}
              </div>
            </div>

          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}

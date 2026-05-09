'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeftIcon } from './_components/icons';
import { CourseSkeleton } from './_components/CourseSkeleton';
import { CourseHeader } from './_components/CourseHeader';
import { EnrollmentCard } from './_components/EnrollmentCard';
import { LessonsList } from './_components/LessonsList';
import type { Course, Enrollment, LessonAccess } from './_components/types';

/**
 * Course detail page. Loads the course + (when logged in) enrollment +
 * lesson-access map, then composes header / enrollment card / lessons list
 * components.
 */
export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useT();
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
          course.status === 'DRAFT' ? (
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
          ) : (
            <div className="space-y-8">

              <CourseHeader course={course} />

              {/* Enrollment block — only when logged in */}
              {user && (
                <EnrollmentCard
                  course={course}
                  enrollment={enrollment}
                  enrollSubmitting={enrollSubmitting}
                  onEnroll={handleEnroll}
                  onUnenroll={handleUnenroll}
                  accessByLesson={accessByLesson}
                />
              )}

              <LessonsList
                courseId={course.id}
                lessons={course.lessons}
                accessByLesson={accessByLesson}
              />

            </div>
          )
        ) : null}
      </main>

      <Footer />
    </div>
  );
}

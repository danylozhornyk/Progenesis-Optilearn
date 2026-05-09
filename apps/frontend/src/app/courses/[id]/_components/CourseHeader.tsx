'use client';

import { useT } from '@/lib/i18n';
import { BookIcon, ClockIcon } from './icons';
import { DIFFICULTY_STYLES, type Course } from './types';

/**
 * Course cover + tag pills + title/description + meta row (lessons,
 * total minutes, author). Pure presentational, all data passed in.
 */
export function CourseHeader({ course }: { course: Course }) {
  const { t, locale } = useT();

  const title = (locale === 'uk' && course.titleUk) ? course.titleUk : course.title;
  const description = (locale === 'uk' && course.descriptionUk) ? course.descriptionUk : course.description;

  const totalMinutes = course.lessons.reduce((s, l) => s + (l.estimatedMinutes ?? 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <>
      {/* Cover image */}
      {course.coverImageUrl && (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          <img
            src={course.coverImageUrl}
            alt={title}
            className="w-full h-full object-contain"
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
    </>
  );
}

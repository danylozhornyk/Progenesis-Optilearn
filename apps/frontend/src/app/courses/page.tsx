'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Course {
  id: string;
  title: string;
  titleUk?: string | null;
  description: string;
  descriptionUk?: string | null;
  discipline: string;
  disciplineUk?: string | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  coverImageUrl?: string;
  author: { id: string; fullName: string };
}

const DIFFICULTY_STYLES: Record<Course['difficulty'], string> = {
  BEGINNER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INTERMEDIATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ADVANCED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

function CourseCardSkeleton() {
  return (
    <div className="surface overflow-hidden animate-pulse">
      <div className="w-full h-44 bg-muted" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-muted rounded w-1/3" />
        <div className="h-5 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    </div>
  );
}

export default function CoursesPage() {
  const { t, locale } = useT();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]       = useState('');
  const [difficulty, setDifficulty] = useState<Course['difficulty'] | 'ALL'>('ALL');
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 9;

  const filtered = courses.filter((c) => {
    if (difficulty !== 'ALL' && c.difficulty !== difficulty) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const title = (locale === 'uk' && c.titleUk) ? c.titleUk : c.title;
    return title.toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    api
      .get<Course[]>('/courses')
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 animate-fade-in">

        {/* Page header */}
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('courses.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('courses.subtitle')}</p>
        </div>

        {/* Search + difficulty filter */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('courses.searchPlaceholder')}
            className="max-w-sm"
          />
          <div className="flex items-center gap-1.5">
            {(['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((d) => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  difficulty === d
                    ? d === 'ALL'
                      ? 'bg-foreground text-background'
                      : DIFFICULTY_STYLES[d as Course['difficulty']] + ' ring-1 ring-current'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {d === 'ALL' ? t('courses.filterAll') : t(`courses.difficulty.${d}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('courses.empty')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map((course) => {
              const title = (locale === 'uk' && course.titleUk) ? course.titleUk : course.title;
              const description = (locale === 'uk' && course.descriptionUk) ? course.descriptionUk : course.description;
              return (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="surface-interactive overflow-hidden flex flex-col group"
                >
                  {/* Cover image */}
                  <div className="w-full h-44 bg-muted overflow-hidden shrink-0">
                    {course.coverImageUrl ? (
                      <img
                        src={course.coverImageUrl}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground opacity-40">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1 gap-3">
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
                    <h2 className="text-base font-semibold text-foreground leading-snug line-clamp-2">
                      {title}
                    </h2>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                      {description}
                    </p>

                    {/* Footer */}
                    <p className="text-xs text-muted-foreground mt-auto">
                      {t('courses.by', { author: course.author.fullName })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <Button variant="ghost" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>←</Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Button
                key={n}
                variant={n === page ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPage(n)}
                className="w-9"
              >
                {n}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>→</Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { ContentRenderer } from '@/app/courses/[id]/lessons/[lessonId]/_components/ContentRenderer';
import type { ContentBlock } from '@/app/courses/[id]/lessons/[lessonId]/_components/types';

interface LessonPayload {
  content: ContentBlock[];
  contentUk?: ContentBlock[] | null;
}

/**
 * Slide-over panel that renders lesson theory content alongside the test.
 * Content is fetched once on first open; subsequent opens reuse the cached data.
 * Closing the drawer does not reset the fetch — answers are untouched.
 */
export function LessonDrawer({
  lessonId,
  lessonTitle,
  isOpen,
  onClose,
}: {
  lessonId: string;
  lessonTitle: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useT();
  const [lesson, setLesson] = useState<LessonPayload | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const fetched = useRef(false);

  // Fetch once on first open.
  useEffect(() => {
    if (!isOpen || fetched.current) return;
    fetched.current = true;
    api.get<LessonPayload>(`/lessons/${lessonId}`)
      .then(setLesson)
      .catch(() => setFetchError(true));
  }, [isOpen, lessonId]);

  // Close on Escape key.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const blocks = lesson
    ? ((locale === 'uk' && lesson.contentUk?.length) ? lesson.contentUk : lesson.content)
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-label={lessonTitle}
        className={`fixed top-0 right-0 h-full z-50 w-full sm:w-[480px] bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <p className="text-sm font-semibold text-foreground truncate">{lessonTitle}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.cancel')}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-base leading-none"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          {fetchError && (
            <p className="text-sm text-red-600 dark:text-red-400">{t('common.error')}</p>
          )}
          {!fetchError && !blocks && (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
              ))}
            </div>
          )}
          {blocks && <ContentRenderer blocks={blocks} />}
        </div>
      </div>
    </>
  );
}

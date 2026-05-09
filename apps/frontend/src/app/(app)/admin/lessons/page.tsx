'use client';

/**
 * Admin → Lessons
 *
 * Lists every lesson on the platform with a column showing which course it
 * belongs to. CRUD via modal:
 *   • Create — pick a course, set title (EN/UK), order, mandatory, est. minutes
 *   • Edit   — same fields except course (move-between-courses isn't supported
 *              by the existing PATCH /lessons/:id endpoint, which only takes
 *              title / orderIndex / estimatedMinutes / isMandatory / content).
 *              Moving a lesson between courses would need a delete + recreate.
 *
 * Lesson `content` (JSON blocks) is intentionally NOT editable here — it's a
 * complex rich-content payload best edited in a dedicated authoring tool.
 */

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LessonStructureEditor } from './_components/LessonStructureEditor';
import { Pencil, Trash2, LayoutList } from 'lucide-react';

interface CourseLite {
  id: string;
  title: string;
  titleUk: string | null;
}

interface AdminLesson {
  id: string;
  title: string;
  titleUk: string | null;
  orderIndex: number;
  isMandatory: boolean;
  estimatedMinutes: number | null;
  prerequisiteId: string | null;
  createdAt: string;
  course: CourseLite;
  _count: { tests: number };
}

interface LessonFormState {
  id?: string;
  courseId: string;
  title: string;
  titleUk: string;
  orderIndex: number;
  isMandatory: boolean;
  estimatedMinutes: number | '';
}

const EMPTY_FORM: LessonFormState = {
  courseId: '',
  title: '',
  titleUk: '',
  orderIndex: 1,
  isMandatory: true,
  estimatedMinutes: '',
};

export default function AdminLessonsPage() {
  const { t, locale } = useT();
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState<LessonFormState | null>(null);
  const [saving, setSaving]   = useState(false);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const PAGE_SIZE = 10;
  const [structureLesson, setStructureLesson] = useState<{ id: string; title: string } | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<AdminLesson[]>('/admin/lessons'),
      api.get<CourseLite[]>('/admin/courses'),
    ])
      .then(([l, c]) => {
        setLessons(l);
        setCourses(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        titleUk: form.titleUk || null,
        orderIndex: form.orderIndex,
        isMandatory: form.isMandatory,
        estimatedMinutes: form.estimatedMinutes === '' ? null : form.estimatedMinutes,
      };
      if (form.id) {
        await api.patch(`/lessons/${form.id}`, payload);
      } else {
        if (!form.courseId) throw new Error(t('admin.lessons.courseRequired'));
        await api.post('/lessons', { ...payload, courseId: form.courseId });
      }
      setForm(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(l: AdminLesson) {
    if (!confirm(t('admin.lessons.deleteConfirm', { title: l.title }))) return;
    try {
      await api.delete(`/lessons/${l.id}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const byCourse = courseFilter === 'all'
    ? lessons
    : lessons.filter((l) => l.course.id === courseFilter);
  const filtered = byCourse.filter((l) =>
    !search.trim() ||
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    (l.titleUk?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('admin.lessons.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.lessons.subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setForm({ ...EMPTY_FORM, courseId: courses[0]?.id ?? '' })} className="self-start sm:self-auto">
          + {t('admin.lessons.add')}
        </Button>
      </div>

      {/* Course filter + search */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {t('admin.lessons.filterCourse')}
        </span>
        <select
          value={courseFilter}
          onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">{t('admin.lessons.allCourses')}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {(locale === 'uk' && c.titleUk) ? c.titleUk : c.title}
            </option>
          ))}
        </select>
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('admin.lessons.search')}
          className="h-8 max-w-xs text-sm"
        />
        <span className="text-xs text-muted-foreground tabular-nums ml-auto">
          {filtered.length} / {lessons.length}
        </span>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="surface border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{t('admin.lessons.empty')}</div>
        ) : (
          <>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium w-12">#</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.lessons.colTitle')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.lessons.colCourse')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.lessons.colMandatory')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.lessons.colTests')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.lessons.colMinutes')}</th>
                <th className="text-right px-4 py-2.5 font-medium">{t('admin.lessons.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((l) => {
                const courseTitle = (locale === 'uk' && l.course.titleUk) ? l.course.titleUk : l.course.title;
                const lessonTitle = (locale === 'uk' && l.titleUk) ? l.titleUk : l.title;
                return (
                  <tr key={l.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{l.orderIndex}</td>
                    <td className="px-4 py-3 font-medium">{lessonTitle}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-muted">{courseTitle}</span>
                    </td>
                    <td className="px-4 py-3">
                      {l.isMandatory
                        ? <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">{t('lesson.mandatory')}</span>
                        : <span className="text-xs px-2 py-0.5 rounded bg-muted">{t('lesson.optional')}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{l._count.tests}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{l.estimatedMinutes ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-1">
                        <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setStructureLesson({ id: l.id, title: l.title })}>
                          <LayoutList className="h-3.5 w-3.5" />
                          {t('admin.lessons.editStructure')}
                        </Button>
                        <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setForm({
                          id: l.id,
                          courseId: l.course.id,
                          title: l.title,
                          titleUk: l.titleUk ?? '',
                          orderIndex: l.orderIndex,
                          isMandatory: l.isMandatory,
                          estimatedMinutes: l.estimatedMinutes ?? '',
                        })}>
                          <Pencil className="h-3.5 w-3.5" />
                          {t('common.edit')}
                        </Button>
                        <Button size="sm" variant="ghost" className="gap-1.5 text-red-600 dark:text-red-400 hover:text-red-700" onClick={() => handleDelete(l)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          {t('common.delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
              <span className="text-xs text-muted-foreground tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setPage(p => p - 1)} disabled={page === 1}>←</Button>
                <span className="text-xs tabular-nums px-2 text-muted-foreground">{page} / {totalPages}</span>
                <Button size="sm" variant="ghost" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>→</Button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Full-screen lesson structure editor */}
      {structureLesson && (
        <LessonStructureEditor
          lessonId={structureLesson.id}
          lessonTitle={structureLesson.title}
          onClose={() => setStructureLesson(null)}
        />
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !saving && setForm(null)}>
          <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">
              {form.id ? t('admin.lessons.editTitle') : t('admin.lessons.addTitle')}
            </h2>

            <Field label={t('admin.lessons.fCourse')}>
              <select
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                disabled={!!form.id}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9 disabled:opacity-60"
              >
                <option value="">{t('admin.lessons.pickCourse')}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(locale === 'uk' && c.titleUk) ? c.titleUk : c.title}
                  </option>
                ))}
              </select>
              {form.id && (
                <p className="text-[11px] text-muted-foreground mt-1">{t('admin.lessons.cannotChangeCourse')}</p>
              )}
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t('admin.lessons.fTitle')}>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label={t('admin.lessons.fTitleUk')}>
                <Input value={form.titleUk} onChange={(e) => setForm({ ...form, titleUk: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label={t('admin.lessons.fOrder')}>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={form.orderIndex}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setForm({ ...form, orderIndex: digits === '' ? 0 : parseInt(digits, 10) });
                  }}
                />
              </Field>
              <Field label={t('admin.lessons.fMinutes')}>
                <Input
                  type="number"
                  min={0}
                  value={form.estimatedMinutes}
                  onChange={(e) => setForm({
                    ...form,
                    estimatedMinutes: e.target.value === '' ? '' : Number(e.target.value),
                  })}
                  placeholder="—"
                />
              </Field>
              <Field label={t('admin.lessons.fMandatoryShort')}>
                <label className="inline-flex items-center gap-2 h-9">
                  <input
                    type="checkbox"
                    checked={form.isMandatory}
                    onChange={(e) => setForm({ ...form, isMandatory: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{t('lesson.mandatory')}</span>
                </label>
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setForm(null)} disabled={saving}>{t('common.cancel')}</Button>
              <Button onClick={handleSave} disabled={saving || !form.title.trim() || (!form.id && !form.courseId)}>
                {saving ? t('common.loading') : t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

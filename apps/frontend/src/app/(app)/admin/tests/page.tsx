'use client';

/**
 * Admin → Tests
 *
 * Lists every test on the platform with columns showing the parent lesson
 * and (via the lesson) the parent course. CRUD via modal:
 *   • Create — pick lesson, set title (EN/UK), description, time-limit,
 *              max-attempts, passing-score, shuffle-questions
 *   • Edit   — same fields except lesson (PATCH /tests/:id only takes
 *              title/description/timeLimitMin/maxAttempts/passingScore/
 *              shuffleQuestions, no lessonId).
 *
 * Test `tasks` (the actual questions) are NOT editable here — they're a
 * separate Task entity edited in a dedicated authoring tool.
 */

import { useEffect, useMemo, useState } from 'react';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TestStructureEditor } from './_components/TestStructureEditor';

interface CourseLite {
  id: string;
  title: string;
  titleUk: string | null;
}

interface LessonLite {
  id: string;
  title: string;
  titleUk: string | null;
  orderIndex: number;
  course: CourseLite;
}

interface AdminTest {
  id: string;
  title: string;
  titleUk: string | null;
  description: string | null;
  descriptionUk: string | null;
  timeLimitMin: number | null;
  maxAttempts: number | null;
  passingScore: number | string;
  shuffleQuestions: boolean;
  createdAt: string;
  lesson: LessonLite;
  _count: { tasks: number; submissions: number };
}

interface TestFormState {
  id?: string;
  lessonId: string;
  title: string;
  titleUk: string;
  description: string;
  descriptionUk: string;
  timeLimitMin: number | '';
  maxAttempts: number | '';
  passingScore: number;
  shuffleQuestions: boolean;
}

const EMPTY_FORM: TestFormState = {
  lessonId: '',
  title: '',
  titleUk: '',
  description: '',
  descriptionUk: '',
  timeLimitMin: '',
  maxAttempts: '',
  passingScore: 60,
  shuffleQuestions: false,
};

export default function AdminTestsPage() {
  const { t, locale } = useT();
  const [tests, setTests]     = useState<AdminTest[]>([]);
  const [lessons, setLessons] = useState<LessonLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState<TestFormState | null>(null);
  const [saving, setSaving]   = useState(false);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [structureTest, setStructureTest] = useState<{ id: string; title: string } | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<AdminTest[]>('/admin/tests'),
      // Re-use /admin/lessons (returns full lesson rows with course) — strip to LessonLite shape
      api.get<{
        id: string; title: string; titleUk: string | null; orderIndex: number;
        course: CourseLite;
      }[]>('/admin/lessons'),
    ])
      .then(([t, l]) => {
        setTests(t);
        setLessons(l.map((row) => ({
          id: row.id,
          title: row.title,
          titleUk: row.titleUk,
          orderIndex: row.orderIndex,
          course: row.course,
        })));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  // Distinct courses (for filter dropdown)
  const courseOptions = useMemo(() => {
    const map = new Map<string, CourseLite>();
    for (const l of lessons) map.set(l.course.id, l.course);
    return Array.from(map.values());
  }, [lessons]);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        titleUk: form.titleUk || null,
        description: form.description || null,
        descriptionUk: form.descriptionUk || null,
        timeLimitMin: form.timeLimitMin === '' ? null : form.timeLimitMin,
        maxAttempts:  form.maxAttempts  === '' ? null : form.maxAttempts,
        passingScore: form.passingScore,
        shuffleQuestions: form.shuffleQuestions,
      };
      if (form.id) {
        await api.patch(`/tests/${form.id}`, payload);
      } else {
        if (!form.lessonId) throw new Error(t('admin.tests.lessonRequired'));
        await api.post('/tests', { ...payload, lessonId: form.lessonId });
      }
      setForm(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(test: AdminTest) {
    if (!confirm(t('admin.tests.deleteConfirm', { title: test.title }))) return;
    try {
      await api.delete(`/tests/${test.id}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const filtered = courseFilter === 'all'
    ? tests
    : tests.filter((t) => t.lesson.course.id === courseFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('admin.tests.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.tests.subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setForm({ ...EMPTY_FORM, lessonId: lessons[0]?.id ?? '' })}>
          + {t('admin.tests.add')}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {t('admin.tests.filterCourse')}
        </span>
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">{t('admin.lessons.allCourses')}</option>
          {courseOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {(locale === 'uk' && c.titleUk) ? c.titleUk : c.title}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground tabular-nums ml-auto">
          {filtered.length} / {tests.length}
        </span>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="surface border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{t('admin.tests.empty')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.tests.colTitle')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.tests.colLesson')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.tests.colCourse')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.tests.colTasks')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.tests.colSubmissions')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.tests.colPass')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.tests.colTime')}</th>
                <th className="text-right px-4 py-2.5 font-medium">{t('admin.tests.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((test) => {
                const testTitle   = (locale === 'uk' && test.titleUk) ? test.titleUk : test.title;
                const lessonTitle = (locale === 'uk' && test.lesson.titleUk) ? test.lesson.titleUk : test.lesson.title;
                const courseTitle = (locale === 'uk' && test.lesson.course.titleUk) ? test.lesson.course.titleUk : test.lesson.course.title;
                return (
                  <tr key={test.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{testTitle}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xs tabular-nums opacity-70">#{test.lesson.orderIndex}</span>
                        {lessonTitle}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{courseTitle}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{test._count.tasks}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{test._count.submissions}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{Number(test.passingScore)}%</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {test.timeLimitMin ? `${test.timeLimitMin}m` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setStructureTest({ id: test.id, title: test.title })}>
                        {t('admin.tests.editStructure')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setForm({
                        id: test.id,
                        lessonId: test.lesson.id,
                        title: test.title,
                        titleUk: test.titleUk ?? '',
                        description: test.description ?? '',
                        descriptionUk: test.descriptionUk ?? '',
                        timeLimitMin: test.timeLimitMin ?? '',
                        maxAttempts: test.maxAttempts ?? '',
                        passingScore: Number(test.passingScore),
                        shuffleQuestions: test.shuffleQuestions,
                      })}>
                        {t('common.edit')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(test)} className="text-red-600 dark:text-red-400 hover:text-red-700">
                        {t('common.delete')}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Full-screen test structure editor */}
      {structureTest && (
        <TestStructureEditor
          testId={structureTest.id}
          testTitle={structureTest.title}
          onClose={() => { setStructureTest(null); load(); }}
        />
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !saving && setForm(null)}>
          <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">
              {form.id ? t('admin.tests.editTitle') : t('admin.tests.addTitle')}
            </h2>

            <Field label={t('admin.tests.fLesson')}>
              <select
                value={form.lessonId}
                onChange={(e) => setForm({ ...form, lessonId: e.target.value })}
                disabled={!!form.id}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9 disabled:opacity-60"
              >
                <option value="">{t('admin.tests.pickLesson')}</option>
                {lessons.map((l) => {
                  const courseTitle = (locale === 'uk' && l.course.titleUk) ? l.course.titleUk : l.course.title;
                  const lessonTitle = (locale === 'uk' && l.titleUk) ? l.titleUk : l.title;
                  return (
                    <option key={l.id} value={l.id}>
                      {courseTitle} — #{l.orderIndex} {lessonTitle}
                    </option>
                  );
                })}
              </select>
              {form.id && (
                <p className="text-[11px] text-muted-foreground mt-1">{t('admin.tests.cannotChangeLesson')}</p>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.tests.fTitle')}>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label={t('admin.tests.fTitleUk')}>
                <Input value={form.titleUk} onChange={(e) => setForm({ ...form, titleUk: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.tests.fDescription')}>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label={t('admin.tests.fDescriptionUk')}>
                <textarea
                  value={form.descriptionUk}
                  onChange={(e) => setForm({ ...form, descriptionUk: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label={t('admin.tests.fTimeLimit')}>
                <Input
                  type="number"
                  min={0}
                  value={form.timeLimitMin}
                  onChange={(e) => setForm({
                    ...form,
                    timeLimitMin: e.target.value === '' ? '' : Number(e.target.value),
                  })}
                  placeholder="—"
                />
              </Field>
              <Field label={t('admin.tests.fMaxAttempts')}>
                <Input
                  type="number"
                  min={0}
                  value={form.maxAttempts}
                  onChange={(e) => setForm({
                    ...form,
                    maxAttempts: e.target.value === '' ? '' : Number(e.target.value),
                  })}
                  placeholder="∞"
                />
              </Field>
              <Field label={t('admin.tests.fPassingScore')}>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.passingScore}
                  onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>

            <Field label={t('admin.tests.fShuffle')}>
              <label className="inline-flex items-center gap-2 h-9">
                <input
                  type="checkbox"
                  checked={form.shuffleQuestions}
                  onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm">{t('admin.tests.fShuffleHint')}</span>
              </label>
            </Field>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setForm(null)} disabled={saving}>{t('common.cancel')}</Button>
              <Button onClick={handleSave} disabled={saving || !form.title.trim() || (!form.id && !form.lessonId)}>
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

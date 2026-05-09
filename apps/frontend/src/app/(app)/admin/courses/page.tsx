'use client';

/**
 * Admin → Courses
 *
 * Lists every course (regardless of status) with edit / delete / add controls.
 *
 * Status lifecycle:
 *   • New courses are always saved as DRAFT (hidden from learners).
 *   • The only way to change status is via the inline Publish / Unpublish
 *     button in the table row — status is never editable inside the form.
 */

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageUploadInput } from '@/components/ImageUploadInput';

type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
type Status     = 'DRAFT' | 'PUBLISHED';

interface AdminCourse {
  id: string;
  title: string;
  titleUk: string | null;
  description: string;
  descriptionUk: string | null;
  discipline: string;
  disciplineUk: string | null;
  difficulty: Difficulty;
  status: Status;
  isVisible: boolean;
  authorId: string;
  createdAt: string;
  coverImageUrl: string | null;
}

interface CourseFormState {
  id?: string;
  title: string;
  titleUk: string;
  description: string;
  descriptionUk: string;
  discipline: string;
  disciplineUk: string;
  difficulty: Difficulty;
  coverImageUrl: string;
}

const EMPTY_FORM: CourseFormState = {
  title: '',
  titleUk: '',
  description: '',
  descriptionUk: '',
  discipline: '',
  disciplineUk: '',
  difficulty: 'BEGINNER',
  coverImageUrl: '',
};

export default function AdminCoursesPage() {
  const { t } = useT();
  const { user } = useAuth();
  const [courses, setCourses]     = useState<AdminCourse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [form, setForm]           = useState<CourseFormState | null>(null);
  const [saving, setSaving]       = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null); // course id being toggled

  function load() {
    setLoading(true);
    api.get<AdminCourse[]>('/admin/courses')
      .then((data) => setCourses(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!form || !user) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        title:          form.title,
        titleUk:        form.titleUk        || null,
        description:    form.description,
        descriptionUk:  form.descriptionUk  || null,
        discipline:     form.discipline,
        disciplineUk:   form.disciplineUk   || null,
        difficulty:     form.difficulty,
        coverImageUrl:  form.coverImageUrl  || null,
        // status / isVisible are intentionally omitted:
        //   • on create — backend enforces DRAFT + isVisible:false
        //   • on edit   — preserve whatever the current status is
        ...(form.id ? {} : { authorId: user.id }),
      };

      if (form.id) {
        await api.patch(`/courses/${form.id}`, payload);
      } else {
        await api.post('/courses', payload);
      }
      setForm(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(c: AdminCourse) {
    setPublishing(c.id);
    setError('');
    try {
      if (c.status === 'DRAFT') {
        await api.patch(`/courses/${c.id}`, { status: 'PUBLISHED', isVisible: true });
      } else {
        await api.patch(`/courses/${c.id}`, { status: 'DRAFT', isVisible: false });
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setPublishing(null);
    }
  }

  async function handleDelete(c: AdminCourse) {
    if (!confirm(t('admin.courses.deleteConfirm', { title: c.title }))) return;
    try {
      await api.delete(`/courses/${c.id}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('admin.courses.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.courses.subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setForm({ ...EMPTY_FORM })}>
          + {t('admin.courses.add')}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* List */}
      <div className="surface border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">{t('common.loading')}</div>
        ) : courses.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{t('admin.courses.empty')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium w-10">{t('admin.courses.colCover')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.courses.colTitle')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.courses.colDiscipline')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.courses.colDifficulty')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.courses.colStatus')}</th>
                <th className="text-right px-4 py-2.5 font-medium">{t('admin.courses.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const isPublishing = publishing === c.id;
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3">
                      {c.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.coverImageUrl} alt="" className="h-8 w-12 object-cover rounded" />
                      ) : (
                        <div className="h-8 w-12 rounded bg-muted flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" aria-hidden>
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{c.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.discipline}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-muted">{c.difficulty}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs ${
                        c.status === 'PUBLISHED'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {/* Publish / Unpublish toggle */}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPublishing}
                        onClick={() => handleTogglePublish(c)}
                        className={
                          c.status === 'DRAFT'
                            ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
                            : 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
                        }
                      >
                        {isPublishing
                          ? t('admin.courses.publishing')
                          : c.status === 'DRAFT'
                            ? t('admin.courses.publish')
                            : t('admin.courses.unpublish')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setForm({
                          id: c.id,
                          title: c.title,
                          titleUk: c.titleUk ?? '',
                          description: c.description,
                          descriptionUk: c.descriptionUk ?? '',
                          discipline: c.discipline,
                          disciplineUk: c.disciplineUk ?? '',
                          difficulty: c.difficulty,
                          coverImageUrl: c.coverImageUrl ?? '',
                        })}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(c)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700"
                      >
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

      {/* Edit / Create form */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !saving && setForm(null)}>
          <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl p-6 space-y-4 mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">
              {form.id ? t('admin.courses.editTitle') : t('admin.courses.addTitle')}
            </h2>

            {!form.id && (
              <p className="text-xs text-muted-foreground">
                {t('admin.courses.draftNotice')}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.courses.fTitle')}>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label={t('admin.courses.fTitleUk')}>
                <Input value={form.titleUk} onChange={(e) => setForm({ ...form, titleUk: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.courses.fDescription')}>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label={t('admin.courses.fDescriptionUk')}>
                <textarea
                  value={form.descriptionUk}
                  onChange={(e) => setForm({ ...form, descriptionUk: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label={t('admin.courses.fDiscipline')}>
                <Input value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} />
              </Field>
              <Field label={t('admin.courses.fDisciplineUk')}>
                <Input value={form.disciplineUk} onChange={(e) => setForm({ ...form, disciplineUk: e.target.value })} />
              </Field>
              <Field label={t('admin.courses.fDifficulty')}>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
                >
                  <option value="BEGINNER">BEGINNER</option>
                  <option value="INTERMEDIATE">INTERMEDIATE</option>
                  <option value="ADVANCED">ADVANCED</option>
                </select>
              </Field>
            </div>

            <Field label={t('admin.courses.fCoverImageUrl')}>
              <ImageUploadInput
                value={form.coverImageUrl}
                onChange={(url) => setForm({ ...form, coverImageUrl: url })}
                placeholder={t('admin.courses.fCoverImageUrlPlaceholder')}
              />
              {form.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.coverImageUrl}
                  alt=""
                  className="mt-2 h-24 w-auto max-w-full rounded object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </Field>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setForm(null)} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
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

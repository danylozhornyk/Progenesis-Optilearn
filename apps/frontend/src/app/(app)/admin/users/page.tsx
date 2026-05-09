'use client';

/**
 * Admin → Users
 *
 * Lists all users with edit (name + role) / delete / add controls.
 * Create-user calls POST /admin/users (admin-only, pre-verified email).
 * Edit calls PATCH /users/:id and PATCH /users/:id/role.
 */

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2 } from 'lucide-react';

type Role = 'STUDENT' | 'ADMIN';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isEmailVerified: boolean;
  createdAt: string;
}

interface UserFormState {
  id?: string;
  email: string;
  fullName: string;
  role: Role;
  password: string; // only used on create
}

const EMPTY_FORM: UserFormState = {
  email: '',
  fullName: '',
  role: 'STUDENT',
  password: '',
};

export default function AdminUsersPage() {
  const { t } = useT();
  const { user: currentUser } = useAuth();
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState<UserFormState | null>(null);
  const [saving, setSaving]   = useState(false);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const PAGE_SIZE = 10;

  function load() {
    setLoading(true);
    api.get<AdminUser[]>('/users')
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setError('');
    try {
      if (form.id) {
        // Edit existing — name, then role separately (different endpoints).
        await api.patch(`/users/${form.id}`, { fullName: form.fullName });
        // Only call role endpoint if it actually changed
        const original = users.find((u) => u.id === form.id);
        if (original && original.role !== form.role) {
          await api.patch(`/users/${form.id}/role`, { role: form.role });
        }
      } else {
        if (!form.email.trim() || !form.password.trim()) {
          throw new Error(t('admin.users.emailPasswordRequired'));
        }
        await api.post('/admin/users', {
          email:    form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          role:     form.role,
        });
      }
      setForm(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(u: AdminUser) {
    if (currentUser?.id === u.id) {
      setError(t('admin.users.cannotDeleteSelf'));
      return;
    }
    if (!confirm(t('admin.users.deleteConfirm', { name: u.fullName }))) return;
    try {
      await api.delete(`/users/${u.id}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const filtered = users.filter((u) =>
    !search.trim() ||
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('admin.users.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.users.subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setForm({ ...EMPTY_FORM })} className="self-start sm:self-auto">
          + {t('admin.users.add')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('admin.users.search')}
          className="h-8 max-w-xs text-sm"
        />
        <span className="text-xs text-muted-foreground tabular-nums ml-auto">
          {filtered.length} / {users.length}
        </span>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="surface border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{t('admin.users.empty')}</div>
        ) : (
          <>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[580px]">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.users.colName')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.users.colEmail')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.users.colRole')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.users.colVerified')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('admin.users.colCreated')}</th>
                <th className="text-right px-4 py-2.5 font-medium">{t('admin.users.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((u) => (
                <tr key={u.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{u.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs ${
                      u.role === 'ADMIN'
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                        : 'bg-muted'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isEmailVerified
                      ? <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-end gap-1">
                      <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setForm({
                        id: u.id,
                        email: u.email,
                        fullName: u.fullName,
                        role: u.role,
                        password: '',
                      })}>
                        <Pencil className="h-3.5 w-3.5" />
                        {t('common.edit')}
                      </Button>
                      <Button size="sm" variant="ghost"
                        onClick={() => handleDelete(u)}
                        disabled={currentUser?.id === u.id}
                        className="gap-1.5 text-red-600 dark:text-red-400 hover:text-red-700 disabled:opacity-40">
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('common.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* Modal form */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !saving && setForm(null)}>
          <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">
              {form.id ? t('admin.users.editTitle') : t('admin.users.addTitle')}
            </h2>

            <Field label={t('admin.users.fName')}>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </Field>

            <Field label={t('admin.users.fEmail')}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!!form.id}
              />
            </Field>

            {!form.id && (
              <Field label={t('admin.users.fPassword')}>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
              </Field>
            )}

            <Field label={t('admin.users.fRole')}>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
              >
                <option value="STUDENT">STUDENT</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </Field>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setForm(null)} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.fullName.trim()}>
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

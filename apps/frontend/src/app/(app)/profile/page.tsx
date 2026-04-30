'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ── Icons ──────────────────────────────────────────────────────

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

// ── Types ──────────────────────────────────────────────────────

type Tab = 'personal' | 'progress' | 'achievements';

interface CourseProgress {
  courseId: string;
  title: string;
  titleUk: string | null;
  discipline: string;
  disciplineUk: string | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  coverImageUrl: string | null;
  totalLessons: number;
  completedLessons: number;
  totalTests: number;
  passedTests: number;
  progressPercent: number;
  totalScore: number;
  enrolled: boolean;
  status: 'NOT_ENROLLED' | 'IN_PROGRESS' | 'COMPLETED';
}

type AchievementCategory = 'PROGRESS' | 'SKILL' | 'STREAK' | 'SOCIAL';

interface AchievementDef {
  code: string;
  name: string;
  nameUk: string;
  description: string;
  descriptionUk: string;
  category: AchievementCategory;
  pointsAwarded: number;
  iconUrl: string | null;
}

interface EarnedAchievement {
  id: string;
  code: string;
  name: string;
  nameUk?: string | null;
  description: string;
  descriptionUk?: string | null;
  category: AchievementCategory;
  iconUrl?: string | null;
  pointsAwarded: number;
  awardedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────

const CATEGORY_GRADIENTS: Record<AchievementCategory, string> = {
  PROGRESS: 'from-amber-400 to-orange-500',
  SKILL: 'from-indigo-400 to-violet-600',
  STREAK: 'from-emerald-400 to-teal-600',
  SOCIAL: 'from-pink-400 to-rose-600',
};

const CATEGORY_LETTER: Record<AchievementCategory, string> = {
  PROGRESS: 'P',
  SKILL: 'S',
  STREAK: 'R',
  SOCIAL: 'C',
};

// ── Page ───────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, patchUser } = useAuth();
  const { t, locale } = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('personal');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.fullName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  const [stats, setStats] = useState({ courses: 0, tests: 0, achievements: 0 });

  // Personal-tab forms
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwState, setPwState] = useState<{ submitting: boolean; success: string; error: string }>({ submitting: false, success: '', error: '' });

  const [emailForm, setEmailForm] = useState({ next: '' });
  const [emailState, setEmailState] = useState<{ submitting: boolean; success: string; error: string }>({ submitting: false, success: '', error: '' });

  const [verifyState, setVerifyState] = useState<{ submitting: boolean; success: string; error: string }>({ submitting: false, success: '', error: '' });
  const [resetState, setResetState] = useState<{ submitting: boolean; success: string; error: string }>({ submitting: false, success: '', error: '' });

  // Progress tab
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  // Achievements tab
  const [definitions, setDefinitions] = useState<AchievementDef[]>([]);
  const [earned, setEarned] = useState<EarnedAchievement[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);

  // ── Effects ─────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<unknown[]>(`/users/${user.id}/progress`),
      api.get<unknown[]>('/submissions/my'),
      api.get<unknown[]>(`/achievements/user/${user.id}`),
    ]).then(([progress, submissions, achievements]) => {
      setStats({
        courses: progress.length,
        tests: submissions.length,
        achievements: achievements.length,
      });
    }).catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab !== 'progress' || !user) return;
    setProgressLoading(true);
    api
      .get<CourseProgress[]>(`/users/${user.id}/course-progress`)
      .then(setCourseProgress)
      .catch(() => {})
      .finally(() => setProgressLoading(false));
  }, [tab, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab !== 'achievements' || !user) return;
    setAchievementsLoading(true);
    Promise.all([
      api.get<AchievementDef[]>('/achievements/definitions'),
      api.get<EarnedAchievement[]>(`/achievements/user/${user.id}`),
    ])
      .then(([defs, earnedList]) => {
        setDefinitions(defs);
        setEarned(earnedList);
      })
      .catch(() => {})
      .finally(() => setAchievementsLoading(false));
  }, [tab, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Avatar / name handlers ──────────────────────────────────

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setAvatarError('');

    try {
      const form = new FormData();
      form.append('image', file);

      const res = await fetch(`${API_URL}/users/${user.id}/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('profile.avatarError'));

      if (data.avatarUrl) patchUser({ avatarUrl: data.avatarUrl });
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : t('profile.avatarError'));
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  }

  function startEditingName() {
    setNameValue(user?.fullName ?? '');
    setNameError('');
    setEditingName(true);
  }

  async function handleSaveName() {
    if (!user || !nameValue.trim()) return;
    setSavingName(true);
    setNameError('');
    try {
      await api.patch(`/users/${user.id}`, { fullName: nameValue.trim() });
      patchUser({ fullName: nameValue.trim() });
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : t('profile.nameError'));
    } finally {
      setSavingName(false);
    }
  }

  function handleCancelName() {
    setEditingName(false);
    setNameValue(user?.fullName ?? '');
    setNameError('');
  }

  // ── Personal-tab handlers ───────────────────────────────────

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (pwForm.next !== pwForm.confirm) {
      setPwState({ submitting: false, success: '', error: t('profile.personal.passwordsDontMatch') });
      return;
    }
    setPwState({ submitting: true, success: '', error: '' });
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      });
      setPwForm({ current: '', next: '', confirm: '' });
      setPwState({ submitting: false, success: t('profile.personal.passwordChanged'), error: '' });
    } catch (err) {
      setPwState({ submitting: false, success: '', error: err instanceof Error ? err.message : t('common.error') });
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !emailForm.next.trim()) return;
    setEmailState({ submitting: true, success: '', error: '' });
    try {
      await api.post('/auth/change-email', { newEmail: emailForm.next.trim() });
      patchUser({ email: emailForm.next.trim(), isEmailVerified: false });
      setEmailForm({ next: '' });
      setEmailState({ submitting: false, success: t('profile.personal.emailChanged'), error: '' });
    } catch (err) {
      setEmailState({ submitting: false, success: '', error: err instanceof Error ? err.message : t('common.error') });
    }
  }

  async function handleResendVerification() {
    setVerifyState({ submitting: true, success: '', error: '' });
    try {
      await api.post('/auth/resend-verification', {});
      setVerifyState({ submitting: false, success: t('profile.personal.verificationSent'), error: '' });
    } catch (err) {
      setVerifyState({ submitting: false, success: '', error: err instanceof Error ? err.message : t('common.error') });
    }
  }

  async function handleSendResetLink() {
    if (!user?.email) return;
    setResetState({ submitting: true, success: '', error: '' });
    try {
      await api.post('/auth/forgot-password', { email: user.email });
      setResetState({ submitting: false, success: t('profile.personal.resetLinkSent'), error: '' });
    } catch (err) {
      setResetState({ submitting: false, success: '', error: err instanceof Error ? err.message : t('common.error') });
    }
  }

  // ── Computed ────────────────────────────────────────────────

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';

  const earnedByCode = new Map(earned.map((e) => [e.code, e]));

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 animate-fade-in">

        {/* Page header */}
        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('profile.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('profile.subtitle')}</p>
        </div>

        {/* Profile header card (always visible) */}
        <div className="surface p-6 space-y-6 mb-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0 group">
              <button
                type="button"
                onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
                className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-border focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                title={t('profile.changeAvatar')}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full bg-muted flex items-center justify-center text-2xl font-semibold text-foreground select-none">
                    {user?.fullName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                  {uploadingAvatar ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                  ) : <CameraIcon />}
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="space-y-2">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelName();
                    }}
                    className="bg-background border-input text-foreground h-9 text-base font-medium"
                    autoFocus
                  />
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" onClick={handleSaveName} disabled={savingName || !nameValue.trim()} className="h-7 px-3 text-xs gap-1">
                      <CheckIcon />
                      {savingName ? t('profile.savingName') : t('profile.saveName')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelName} disabled={savingName} className="h-7 px-2 text-xs gap-1 text-muted-foreground">
                      <XIcon />
                      {t('profile.cancel')}
                    </Button>
                  </div>
                  {nameError && <p className="text-xs text-red-600 dark:text-red-400">{nameError}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-foreground truncate">{user?.fullName}</span>
                  <button type="button" onClick={startEditingName} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" title={t('profile.editName')}>
                    <EditIcon />
                  </button>
                </div>
              )}
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              {avatarError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{avatarError}</p>}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
            {[
              { label: t('profile.stats.courses'), value: stats.courses },
              { label: t('profile.stats.tests'), value: stats.tests },
              { label: t('profile.stats.achievements'), value: stats.achievements },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-semibold tracking-tight text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6">
          {(['personal', 'progress', 'achievements'] as Tab[]).map((tabKey) => (
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
              {t(`profile.tabs.${tabKey}`)}
            </button>
          ))}
        </div>

        {/* ─────────────────── PERSONAL TAB ─────────────────── */}
        {tab === 'personal' && (
          <div className="space-y-6">

            {/* Account info */}
            <section className="surface p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">{t('profile.personal.accountSection')}</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground w-32 shrink-0">{t('profile.role')}</dt>
                  <dd>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground capitalize">
                      {user?.role?.toLowerCase()}
                    </span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground w-32 shrink-0">{t('profile.memberSince')}</dt>
                  <dd className="text-foreground">{joinDate}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground w-32 shrink-0">{t('profile.email')}</dt>
                  <dd>
                    {user?.isEmailVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                        <CheckIcon />{t('profile.emailVerified')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-400">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        {t('profile.emailUnverified')}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Change password */}
            <section className="surface p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">{t('profile.personal.changePassword')}</h2>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="pw-current">{t('profile.personal.currentPassword')}</label>
                  <Input
                    id="pw-current"
                    type="password"
                    autoComplete="current-password"
                    value={pwForm.current}
                    onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="pw-new">{t('profile.personal.newPassword')}</label>
                  <Input
                    id="pw-new"
                    type="password"
                    autoComplete="new-password"
                    value={pwForm.next}
                    onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
                    minLength={8}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="pw-confirm">{t('profile.personal.confirmNewPassword')}</label>
                  <Input
                    id="pw-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                    minLength={8}
                    required
                  />
                </div>
                {pwState.error && <p className="text-xs text-red-600 dark:text-red-400">{pwState.error}</p>}
                {pwState.success && <p className="text-xs text-green-700 dark:text-green-400">{pwState.success}</p>}
                <Button type="submit" disabled={pwState.submitting} className="text-sm">
                  {pwState.submitting ? t('profile.personal.submittingPassword') : t('profile.personal.submitChangePassword')}
                </Button>
              </form>
            </section>

            {/* Change email */}
            <section className="surface p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">{t('profile.personal.changeEmail')}</h2>
              <form onSubmit={handleChangeEmail} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="email-new">{t('profile.personal.newEmail')}</label>
                  <Input
                    id="email-new"
                    type="email"
                    value={emailForm.next}
                    onChange={(e) => setEmailForm({ next: e.target.value })}
                    placeholder={user?.email ?? 'you@example.com'}
                    required
                  />
                </div>
                {emailState.error && <p className="text-xs text-red-600 dark:text-red-400">{emailState.error}</p>}
                {emailState.success && <p className="text-xs text-green-700 dark:text-green-400">{emailState.success}</p>}
                <Button type="submit" disabled={emailState.submitting || !emailForm.next.trim()} className="text-sm">
                  {emailState.submitting ? t('profile.personal.submittingEmail') : t('profile.personal.submitChangeEmail')}
                </Button>
              </form>
            </section>

            {/* Resend verification */}
            <section className="surface p-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground">{t('profile.personal.verifyEmail')}</h2>
              <p className="text-sm text-muted-foreground">{t('profile.personal.verifyEmailDescription')}</p>
              {user?.isEmailVerified ? (
                <p className="text-xs text-green-700 dark:text-green-400">{t('profile.personal.alreadyVerified')}</p>
              ) : (
                <>
                  {verifyState.error && <p className="text-xs text-red-600 dark:text-red-400">{verifyState.error}</p>}
                  {verifyState.success && <p className="text-xs text-green-700 dark:text-green-400">{verifyState.success}</p>}
                  <Button onClick={handleResendVerification} disabled={verifyState.submitting} variant="outline" className="text-sm">
                    {verifyState.submitting ? t('profile.personal.sending') : t('profile.personal.sendVerification')}
                  </Button>
                </>
              )}
            </section>

            {/* Forgot password (send reset link) */}
            <section className="surface p-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground">{t('profile.personal.forgotPassword')}</h2>
              <p className="text-sm text-muted-foreground">{t('profile.personal.forgotPasswordDescription')}</p>
              {resetState.error && <p className="text-xs text-red-600 dark:text-red-400">{resetState.error}</p>}
              {resetState.success && <p className="text-xs text-green-700 dark:text-green-400">{resetState.success}</p>}
              <Button onClick={handleSendResetLink} disabled={resetState.submitting} variant="outline" className="text-sm">
                {resetState.submitting ? t('profile.personal.sending') : t('profile.personal.sendResetLink')}
              </Button>
            </section>
          </div>
        )}

        {/* ─────────────────── PROGRESS TAB ─────────────────── */}
        {tab === 'progress' && (
          <div className="space-y-4">
            <div className="space-y-1 mb-2">
              <h2 className="text-base font-semibold text-foreground">{t('profile.progress.title')}</h2>
              <p className="text-sm text-muted-foreground">{t('profile.progress.subtitle')}</p>
            </div>

            {progressLoading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-28 bg-muted rounded-lg" />
                ))}
              </div>
            ) : courseProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('profile.progress.empty')}</p>
            ) : (
              [...courseProgress]
                .sort((a, b) => {
                  // Enrolled (in-progress / completed) first, then not-enrolled
                  const rank = (s: CourseProgress['status']) =>
                    s === 'IN_PROGRESS' ? 0 : s === 'COMPLETED' ? 1 : 2;
                  return rank(a.status) - rank(b.status);
                })
                .map((c) => {
                const title = (locale === 'uk' && c.titleUk) ? c.titleUk : c.title;
                const discipline = (locale === 'uk' && c.disciplineUk) ? c.disciplineUk : c.discipline;
                const statusKey =
                  c.status === 'COMPLETED' ? 'completed' :
                  c.status === 'IN_PROGRESS' ? 'inProgress' :
                  'notEnrolled';
                const statusStyle =
                  c.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  c.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-muted text-muted-foreground';

                return (
                  <Link
                    key={c.courseId}
                    href={`/courses/${c.courseId}`}
                    className={`surface-interactive block p-5 space-y-3 ${c.status === 'NOT_ENROLLED' ? 'opacity-70' : ''}`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                            {discipline}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyle}`}>
                            {t(`profile.progress.${statusKey}`)}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
                      </div>
                      <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums shrink-0">
                        {c.status === 'NOT_ENROLLED' ? '—' : `${Math.round(c.progressPercent)}%`}
                      </span>
                    </div>

                    {/* Progress bar — only when enrolled */}
                    {c.status !== 'NOT_ENROLLED' && (
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            c.status === 'COMPLETED' ? 'bg-green-500' : 'bg-foreground'
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, c.progressPercent))}%` }}
                        />
                      </div>
                    )}

                    {/* Counts */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        <span className="text-foreground font-medium">{t('profile.progress.lessons')}:</span>{' '}
                        {t('profile.progress.lessonsProgress', { done: c.completedLessons, total: c.totalLessons })}
                      </span>
                      <span>
                        <span className="text-foreground font-medium">{t('profile.progress.tests')}:</span>{' '}
                        {t('profile.progress.testsProgress', { done: c.passedTests, total: c.totalTests })}
                      </span>
                    </div>

                    {c.status === 'NOT_ENROLLED' && (
                      <p className="text-[11px] text-muted-foreground italic">
                        {t('profile.progress.browseCourse')} →
                      </p>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        )}

        {/* ─────────────────── ACHIEVEMENTS TAB ─────────────────── */}
        {tab === 'achievements' && (
          <div className="space-y-4">
            <div className="space-y-1 mb-2">
              <h2 className="text-base font-semibold text-foreground">{t('profile.achievements.title')}</h2>
              <p className="text-sm text-muted-foreground">{t('profile.achievements.subtitle')}</p>
            </div>

            {achievementsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-muted rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {definitions.map((def) => {
                  const earnedRow = earnedByCode.get(def.code);
                  const isEarned = !!earnedRow;
                  const name = (locale === 'uk' && def.nameUk) ? def.nameUk : def.name;
                  const description = (locale === 'uk' && def.descriptionUk) ? def.descriptionUk : def.description;
                  const earnedDate = earnedRow?.awardedAt
                    ? new Date(earnedRow.awardedAt).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })
                    : null;

                  return (
                    <div
                      key={def.code}
                      className="relative group flex flex-col items-center text-center surface p-4 hover:border-foreground/40 transition-colors"
                    >
                      {/* Badge circle */}
                      <div className="relative">
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-sm ${
                            isEarned
                              ? `bg-gradient-to-br ${CATEGORY_GRADIENTS[def.category]}`
                              : 'bg-gradient-to-br from-muted-foreground/40 to-muted-foreground/20 grayscale opacity-60'
                          }`}
                        >
                          {def.iconUrl ? (
                            <img src={def.iconUrl} alt={name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className={isEarned ? '' : 'opacity-70'}>{CATEGORY_LETTER[def.category]}</span>
                          )}
                        </div>
                        {/* Lock overlay for unearned */}
                        {!isEarned && (
                          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground">
                            <LockIcon />
                          </div>
                        )}
                        {isEarned && (
                          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background border border-green-300 dark:border-green-700 flex items-center justify-center text-green-600 dark:text-green-400">
                            <CheckIcon />
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <p className={`mt-3 text-sm font-medium leading-tight ${isEarned ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {name}
                      </p>

                      {/* Status row */}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {isEarned ? t('profile.achievements.earned') : t('profile.achievements.locked')}
                      </p>

                      {/* Hover tooltip */}
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute z-20 left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 p-3 rounded-lg bg-foreground text-background text-xs leading-relaxed shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity space-y-1.5 text-left"
                      >
                        <p className="font-semibold text-sm">{name}</p>
                        <p className="opacity-80">
                          <span className="font-medium opacity-100">{t('profile.achievements.howTo')}:</span>{' '}
                          {description}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-background/20">
                          <span className="opacity-80">
                            {t('profile.achievements.category')}:{' '}
                            <span className="font-medium opacity-100">
                              {t(`profile.achievements.categoryLabel.${def.category}`)}
                            </span>
                          </span>
                          <span className="opacity-80 font-medium">
                            {t('profile.achievements.points', { n: def.pointsAwarded })}
                          </span>
                        </div>
                        {earnedDate && (
                          <p className="opacity-70 pt-1 border-t border-background/20">
                            {t('profile.achievements.earnedOn', { date: earnedDate })}
                          </p>
                        )}
                        {/* Arrow */}
                        <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-foreground rotate-45" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

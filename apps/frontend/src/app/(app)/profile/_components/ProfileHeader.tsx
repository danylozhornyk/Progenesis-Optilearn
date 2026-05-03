'use client';

import { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CameraIcon, EditIcon, CheckIcon, XIcon } from './icons';
import type { CourseProgress } from './types';

interface StatPair { done: number; total: number }

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Top "identity" card on the profile page: avatar (with upload), full-name
 * editor, and the courses / tests / achievements stats row. State for the
 * avatar/name editing, plus the stats counters, lives entirely in here so the
 * page component itself stays small.
 */
export function ProfileHeader() {
  const { user, patchUser } = useAuth();
  const { t } = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.fullName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  const [stats, setStats] = useState<{
    courses: StatPair;
    tests: StatPair;
    achievements: StatPair;
  }>({
    courses: { done: 0, total: 0 },
    tests: { done: 0, total: 0 },
    achievements: { done: 0, total: 0 },
  });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      // Per-course progress for ALL published courses (gives finished /
      // total courses + unique passed-test totals across the platform).
      api.get<CourseProgress[]>(`/users/${user.id}/course-progress`),
      // Achievement definitions = max points possible.
      api.get<{ pointsAwarded: number }[]>('/achievements/definitions'),
      // User's earned achievements = points actually obtained.
      api.get<{ pointsAwarded: number }[]>(`/achievements/user/${user.id}`),
    ]).then(([courses, defs, earned]) => {
      const finishedCourses = courses.filter((c) => c.status === 'COMPLETED').length;
      const totalCourses = courses.length;

      const passedTests = courses.reduce((s, c) => s + c.passedTests, 0);
      const totalTests = courses.reduce((s, c) => s + c.totalTests, 0);

      const earnedPoints = earned.reduce((s, a) => s + (a.pointsAwarded ?? 0), 0);
      const maxPoints = defs.reduce((s, d) => s + (d.pointsAwarded ?? 0), 0);

      setStats({
        courses: { done: finishedCourses, total: totalCourses },
        tests: { done: passedTests, total: totalTests },
        achievements: { done: earnedPoints, total: maxPoints },
      });
    }).catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
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

      {/* Stats row — done/total format for each */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
        {[
          { label: t('profile.stats.courses'), pair: stats.courses },
          { label: t('profile.stats.tests'), pair: stats.tests },
          { label: t('profile.stats.achievements'), pair: stats.achievements },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-xl font-semibold tracking-tight text-foreground tabular-nums">
              {s.pair.done}
              <span className="text-muted-foreground font-medium">/{s.pair.total}</span>
            </p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

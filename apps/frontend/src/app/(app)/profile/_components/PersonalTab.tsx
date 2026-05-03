'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PasswordStrengthMeter,
  isPasswordErrorCode,
} from '@/components/PasswordStrengthMeter';
import { CheckIcon } from './icons';

/**
 * "Personal" tab: account info readout + change-password / change-email /
 * resend-verification / send-reset-link forms. All state is local — the page
 * only renders this when its tab is active.
 */
export function PersonalTab() {
  const { user, patchUser } = useAuth();
  const { t } = useT();

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwState, setPwState] = useState<{ submitting: boolean; success: string; error: string }>({ submitting: false, success: '', error: '' });

  const [emailForm, setEmailForm] = useState({ next: '' });
  const [emailState, setEmailState] = useState<{ submitting: boolean; success: string; error: string }>({ submitting: false, success: '', error: '' });

  const [verifyState, setVerifyState] = useState<{ submitting: boolean; success: string; error: string }>({ submitting: false, success: '', error: '' });
  const [resetState, setResetState] = useState<{ submitting: boolean; success: string; error: string }>({ submitting: false, success: '', error: '' });

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';

  function validateNewPassword(pw: string): string {
    if (pw.length < 8)            return t('auth.passwordErrors.PASSWORD_TOO_SHORT');
    if (!/[A-Z]/.test(pw))        return t('auth.passwordErrors.PASSWORD_NO_UPPERCASE');
    if (!/[a-z]/.test(pw))        return t('auth.passwordErrors.PASSWORD_NO_LOWERCASE');
    if (!/[0-9]/.test(pw))        return t('auth.passwordErrors.PASSWORD_NO_DIGIT');
    if (!/[^A-Za-z0-9]/.test(pw)) return t('auth.passwordErrors.PASSWORD_NO_SPECIAL');
    return '';
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const ruleError = validateNewPassword(pwForm.next);
    if (ruleError) {
      setPwState({ submitting: false, success: '', error: ruleError });
      return;
    }
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
      const msg = err instanceof Error ? err.message : t('common.error');
      setPwState({
        submitting: false,
        success: '',
        error: isPasswordErrorCode(msg) ? t(`auth.passwordErrors.${msg}`) : msg,
      });
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

  return (
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
              required
            />
            <PasswordStrengthMeter password={pwForm.next} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="pw-confirm">{t('profile.personal.confirmNewPassword')}</label>
            <Input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
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
  );
}

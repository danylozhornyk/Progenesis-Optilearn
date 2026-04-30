'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

type State = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { t } = useT();
  const [state, setState] = useState<State>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMessage(t('auth.emailVerification.missingToken'));
      setState('error');
      return;
    }

    api
      .get(`/auth/verify-email?token=${token}`)
      .then(() => setState('success'))
      .catch((err: unknown) => {
        setErrorMessage(
          err instanceof Error ? err.message : t('auth.emailVerification.errorDescription')
        );
        setState('error');
      });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === 'loading') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground animate-spin"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('auth.emailVerification.verifying')}
          </h1>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-green-600 dark:text-green-400"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('auth.emailVerification.successTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('auth.emailVerification.successDescription')}
          </p>
        </div>
        <Button asChild>
          <Link href="/profile">{t('auth.emailVerification.goToProfile')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-600 dark:text-red-400"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('auth.emailVerification.errorTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {errorMessage || t('auth.emailVerification.errorDescription')}
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/login">{t('auth.emailVerification.backToLogin')}</Link>
      </Button>
    </div>
  );
}

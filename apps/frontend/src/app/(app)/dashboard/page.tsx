'use client';

import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useT();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 animate-fade-in">

        {/* Page header */}
        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.welcome', { name: user?.fullName ?? '' })}
          </p>
        </div>

        {/* Email verification banner */}
        {!user?.isEmailVerified && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-300">
            {t('auth.emailVerification.banner')}
          </div>
        )}

        {/* Placeholder stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Courses enrolled', value: '0' },
            { label: 'Tests completed', value: '0' },
            { label: 'Achievements', value: '0' },
          ].map((stat) => (
            <div key={stat.label} className="surface p-6 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
              <p className="text-3xl font-semibold tracking-tight text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

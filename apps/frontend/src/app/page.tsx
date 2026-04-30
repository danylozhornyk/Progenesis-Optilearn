'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const { t } = useT();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background bg-subtle-gradient">
      <Header />

      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-2xl mx-auto text-center space-y-8 animate-fade-in">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Interactive math learning platform
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-foreground text-balance">
              {t('landing.headline')}
              <br />
              <span className="text-muted-foreground font-light">
                {t('landing.headlineMuted')}
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              {t('landing.description')}
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {user ? (
              <Button size="lg" asChild className="shadow-soft">
                <Link href="/profile">{t('common.dashboard')}</Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild className="shadow-soft">
                  <Link href="/register">{t('landing.startLearning')}</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">{t('common.signIn')}</Link>
                </Button>
              </>
            )}
          </div>

          {/* Feature pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap pt-4">
            {['Graph Theory', 'Numerical Methods', 'Optimization'].map((topic) => (
              <span
                key={topic}
                className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

function IcnGraph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" aria-hidden="true">
      <circle cx="5" cy="12" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="19" cy="19" r="2" />
      <circle cx="12" cy="7" r="2" /><circle cx="12" cy="17" r="2" />
      <line x1="7" y1="11" x2="10" y2="8" /><line x1="7" y1="13" x2="10" y2="16" />
      <line x1="14" y1="7" x2="17" y2="6" /><line x1="14" y1="17" x2="17" y2="18" />
      <line x1="14" y1="9" x2="17" y2="17" />
    </svg>
  );
}

function IcnFormula() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" aria-hidden="true">
      <path d="M4 7c0-1.1.9-2 2-2h1l2 12 2.5-8 2.5 5L16 9l2 7h1a2 2 0 0 0 2-2" />
    </svg>
  );
}

function IcnTarget() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IcnCert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <circle cx="15" cy="10" r="2" />
      <path d="M7 8h10M7 11h5" />
    </svg>
  );
}

function IcnBot() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8" aria-hidden="true">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M12 2v4M8 2h8" />
      <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
      <path d="M9.5 18.5c1 .7 4 .7 5 0" />
    </svg>
  );
}

function IcnBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IcnCheckCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4 12 14.01l-3-3" />
    </svg>
  );
}

function IcnAward() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" aria-hidden="true">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

function IcnCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function LandingPage() {
  const { t } = useT();
  const { user } = useAuth();

  const disciplines = [
    {
      key: 'graphTheory',
      icon: <IcnGraph />,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800/40',
      check: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    },
    {
      key: 'numericalMethods',
      icon: <IcnFormula />,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
      border: 'border-violet-200 dark:border-violet-800/40',
      check: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
    },
    {
      key: 'optimization',
      icon: <IcnTarget />,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800/40',
      check: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    },
  ] as const;

  const steps = [
    { icon: <IcnBook />, titleKey: 'landing.howItWorks.s1title', descKey: 'landing.howItWorks.s1desc' },
    { icon: <IcnCheckCircle />, titleKey: 'landing.howItWorks.s2title', descKey: 'landing.howItWorks.s2desc' },
    { icon: <IcnAward />, titleKey: 'landing.howItWorks.s3title', descKey: 'landing.howItWorks.s3desc' },
  ];


  return (
    <div className="min-h-screen flex flex-col bg-background bg-subtle-gradient">
      <Header />

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────── */}
        <section className="px-6 py-24 sm:py-32 flex items-center justify-center">
          <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {t('landing.badge')}
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl sm:text-7xl font-semibold tracking-tight text-foreground text-balance leading-[1.1]">
                {t('landing.headline')}
                <br />
                <span className="text-muted-foreground font-light">{t('landing.headlineMuted')}</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                {t('landing.description')}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              {!user && (
                <Button size="lg" asChild>
                  <Link href="/register">{t('landing.startLearning')}</Link>
                </Button>
              )}
              <Button size="lg" variant={user ? 'default' : 'outline'} asChild>
                <Link href="/courses">{t('landing.browseCourses')}</Link>
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
              {(['graphTheory', 'numericalMethods', 'optimization'] as const).map((key) => (
                <span key={key} className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                  {t(`landing.${key}.name`)}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Purpose / Disciplines ─────────────────────── */}
        <section className="px-6 py-20 border-t border-border bg-muted/20">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                {t('landing.purpose.overline')}
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                {t('landing.purpose.title')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {t('landing.purpose.desc')}
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              {disciplines.map(({ key, icon, color, bg, border, check }) => (
                <div key={key} className={`rounded-xl border ${border} bg-card p-6 space-y-4`}>
                  <div className={`inline-flex p-2.5 rounded-lg ${bg} ${color}`}>{icon}</div>
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-foreground">{t(`landing.${key}.name`)}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.${key}.desc`)}</p>
                  </div>
                  <ul className="space-y-2 pt-1 border-t border-border">
                    {(['p1', 'p2', 'p3'] as const).map((p) => (
                      <li key={p} className="flex items-center gap-2 text-xs text-muted-foreground pt-2 first:pt-2">
                        <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${check}`}>
                          <IcnCheck />
                        </span>
                        {t(`landing.${key}.${p}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────── */}
        <section className="px-6 py-20">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                {t('landing.howItWorks.overline')}
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                {t('landing.howItWorks.title')}
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-10">
              {steps.map(({ icon, titleKey, descKey }, idx) => (
                <div key={titleKey} className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full surface flex items-center justify-center text-muted-foreground">
                      {icon}
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background text-xs font-semibold flex items-center justify-center">
                      {idx + 1}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground">{t(titleKey)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Certificate ───────────────────────────────── */}
        <section className="px-6 py-20 border-t border-border bg-muted/20">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                  <IcnCert />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    {t('landing.cert.overline')}
                  </span>
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                    {t('landing.cert.title')}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {t('landing.cert.desc')}
                  </p>
                </div>
                <ul className="space-y-3">
                  {(['p1', 'p2', 'p3'] as const).map((p) => (
                    <li key={p} className="flex items-start gap-3 text-sm text-foreground">
                      <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 flex items-center justify-center">
                        <IcnCheck />
                      </span>
                      {t(`landing.cert.${p}`)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="surface rounded-xl p-8 space-y-5 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-amber-400/10 pointer-events-none" />
                <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-amber-400/10 pointer-events-none" />
                <div className="relative space-y-5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      {t('landing.cert.mockLabel')}
                    </span>
                  </div>
                  <div className="divider" />
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t('landing.cert.mockCertifies')}</p>
                    <p className="text-2xl font-semibold text-foreground">{t('landing.cert.mockName')}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t('landing.cert.mockFor')}</p>
                    <p className="font-medium text-foreground">{t('landing.cert.mockCourse')}</p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">{t('landing.cert.mockScore')}</p>
                      <p className="text-xl font-semibold text-green-600 dark:text-green-400">95%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-0.5">{t('landing.cert.mockStatus')}</p>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-full">
                        <IcnCheck />
                        {t('landing.cert.mockPassed')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── AI Recommendations ────────────────────────── */}
        <section className="px-6 py-20">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 surface rounded-xl p-5 space-y-4">

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border p-3 flex flex-col gap-1.5">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <p className="text-base font-bold text-foreground leading-none">20</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{t('profile.recommendations.stats.attempts')}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 flex flex-col gap-1.5 bg-foreground/[0.04]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <p className="text-base font-bold text-foreground leading-none">74.2%</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{t('profile.recommendations.stats.avgScore')}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 flex flex-col gap-1.5 bg-foreground/[0.04]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <p className="text-base font-bold text-foreground leading-none">65.0%</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{t('profile.recommendations.stats.passRate')}</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="pl-3 border-l-2 border-foreground/20">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
                    {t('profile.recommendations.summary')}
                  </p>
                  <p className="text-sm text-foreground leading-relaxed text-justify">{t('landing.ai.mockSummary')}</p>
                </div>

                {/* Strong / weak panels */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border p-3 space-y-2 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{t('profile.recommendations.strongPoints')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('landing.ai.mockStrong')}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed text-justify">{t('landing.ai.mockStrongDetail')}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border p-3 space-y-2 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{t('profile.recommendations.weakPoints')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('landing.ai.mockNeedsPractice')}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed text-justify">{t('landing.ai.mockWeakDetail')}</p>
                    </div>
                  </div>
                </div>

                {/* Roadmap */}
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                    {t('profile.recommendations.roadmap')}
                  </p>
                  {/* Step 1 */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
                      <div className="w-px flex-1 bg-border mt-1 min-h-[20px]" />
                    </div>
                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold text-foreground">{t('landing.ai.mockRecLabel')}</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          {t('profile.recommendations.priority.HIGH')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed text-justify">{t('landing.ai.mockRecText')}</p>
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">2</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold text-foreground">{t('landing.ai.mockStep2Title')}</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {t('profile.recommendations.priority.MEDIUM')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed text-justify">{t('landing.ai.mockStep2Desc')}</p>
                    </div>
                  </div>
                </div>

              </div>

              <div className="order-1 md:order-2 space-y-6">
                <div className="inline-flex p-3 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400 border border-violet-200 dark:border-violet-800/40">
                  <IcnBot />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    {t('landing.ai.overline')}
                  </span>
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                    {t('landing.ai.title')}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {t('landing.ai.desc')}
                  </p>
                </div>
                <ul className="space-y-3">
                  {(['p1', 'p2', 'p3'] as const).map((p) => (
                    <li key={p} className="flex items-start gap-3 text-sm text-foreground">
                      <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400 flex items-center justify-center">
                        <IcnCheck />
                      </span>
                      {t(`landing.ai.${p}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────── */}
        <section className="px-6 py-20 border-t border-border bg-muted/20">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              {t('landing.cta.title')}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('landing.cta.desc')}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {!user && (
                <Button size="lg" asChild>
                  <Link href="/register">{t('landing.startLearning')}</Link>
                </Button>
              )}
              <Button size="lg" variant={user ? 'default' : 'outline'} asChild>
                <Link href="/courses">{t('landing.browseCourses')}</Link>
              </Button>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}

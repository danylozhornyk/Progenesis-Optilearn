'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProfileHeader } from './_components/ProfileHeader';
import { PersonalTab } from './_components/PersonalTab';
import { ProgressTab } from './_components/ProgressTab';
import { AchievementsTab } from './_components/AchievementsTab';
import { RecommendationsTab } from './_components/RecommendationsTab';
import type { Tab } from './_components/types';

/**
 * Thin orchestrator: renders the always-visible identity card plus a tab bar
 * that mounts exactly one of the three tab components. Each tab owns its own
 * data fetching and form state — see _components/ for the bodies.
 */
export default function ProfilePage() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('personal');

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
        <ProfileHeader />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6">
          {(['personal', 'progress', 'achievements', 'recommendations'] as Tab[]).map((tabKey) => (
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

        {tab === 'personal' && <PersonalTab />}
        {tab === 'progress' && <ProgressTab />}
        {tab === 'achievements' && <AchievementsTab />}
        {tab === 'recommendations' && <RecommendationsTab />}
      </main>

      <Footer />
    </div>
  );
}

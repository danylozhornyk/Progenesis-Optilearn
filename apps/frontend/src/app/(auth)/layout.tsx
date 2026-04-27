'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
      <path d="M2 12h20"/>
    </svg>
  );
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'uk', label: 'Українська' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { theme, locale, updatePreferences } = useAuth();
  const { t } = useT();
  const isDark = theme === 'dark';
  const currentLanguage = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-zinc-950 dark:bg-zinc-900 text-white relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded-sm" />
          <span className="font-semibold text-lg tracking-tight">{t('common.appName')}</span>
        </div>

        <div className="relative space-y-6">
          <div className="w-8 h-px bg-zinc-600" />
          <blockquote className="text-2xl font-light leading-relaxed text-zinc-200 tracking-tight">
            "{t('auth.branding.quote')}"
          </blockquote>
          <p className="text-zinc-500 text-sm">{t('auth.branding.quoteAuthor')}</p>
        </div>

        <div className="relative text-zinc-600 text-xs">
          {t('common.copyright', { year: new Date().getFullYear() })}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col bg-background">

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-6 pb-2">
          <Link href="/" className="flex items-center gap-2 lg:invisible">
            <div className="w-5 h-5 bg-foreground rounded-sm" />
            <span className="font-semibold text-foreground">{t('common.appName')}</span>
          </Link>

          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="icon" onClick={() => updatePreferences({ theme: isDark ? 'light' : 'dark' })}>
              {isDark ? <SunIcon /> : <MoonIcon />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <GlobeIcon />
                  <span className="text-xs uppercase">{currentLanguage.code}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
                <DropdownMenuLabel className="text-muted-foreground">{t('common.language')}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                {LANGUAGES.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => updatePreferences({ locale: lang.code })}
                    className="flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span>{lang.label}</span>
                    {lang.code === locale && <span className="text-xs text-muted-foreground">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm animate-fade-in">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

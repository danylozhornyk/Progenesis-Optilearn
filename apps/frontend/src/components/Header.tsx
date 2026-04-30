'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
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

export default function Header() {
  const { user, logout, theme, locale, updatePreferences } = useAuth();
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const isDark = theme === 'dark';
  const currentLanguage = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  function handleLogout() {
    logout();
    router.push('/');
  }

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Logo + primary nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-5 h-5 bg-foreground rounded-sm transition-transform group-hover:scale-110" />
            <span className="font-semibold text-foreground tracking-tight">
              {t('common.appName')}
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {[
              { href: '/courses', label: t('nav.courses') },
              { href: '/faq', label: t('nav.faq') },
            ].map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    active
                      ? 'text-foreground font-medium bg-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side */}
        <nav className="flex items-center gap-1">

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => updatePreferences({ theme: isDark ? 'light' : 'dark' })}
            className="text-muted-foreground hover:text-foreground"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </Button>

          {/* Language picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                <GlobeIcon />
                <span className="text-xs uppercase">{currentLanguage.code}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border">
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('common.language')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => updatePreferences({ locale: lang.code })}
                  className="flex items-center justify-between gap-4 cursor-pointer text-foreground"
                >
                  <span>{lang.label}</span>
                  {lang.code === locale && (
                    <span className="text-xs text-muted-foreground">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Divider */}
          <div className="w-px h-4 bg-border mx-1" />

          {/* Auth buttons */}
          {user ? (
            <>
              <Link
                href="/profile"
                title={user.fullName}
                className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-border hover:ring-2 hover:ring-foreground transition-all flex items-center justify-center bg-muted shrink-0"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-foreground select-none">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                {t('common.signOut')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                <Link href="/login">{t('common.signIn')}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">{t('common.getStarted')}</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

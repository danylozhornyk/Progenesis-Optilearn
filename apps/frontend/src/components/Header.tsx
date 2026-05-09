'use client';

import { useState } from 'react';
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

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"/>
      <line x1="4" y1="12" x2="20" y2="12"/>
      <line x1="4" y1="18" x2="20" y2="18"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
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
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    router.push('/');
    setMobileOpen(false);
  }

  const navLinks = [
    { href: '/courses', label: t('nav.courses') },
    { href: '/faq',     label: t('nav.faq')     },
    ...(user?.role === 'ADMIN' ? [{ href: '/admin/stats', label: t('nav.admin') }] : []),
  ];

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Logo + desktop primary nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-foreground shrink-0 transition-transform group-hover:scale-110 overflow-hidden"
              aria-hidden="true"
            >
              <line x1="3" y1="17" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="10" y1="10" x2="17" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="3" cy="17" r="3" fill="currentColor"/>
              <circle cx="10" cy="10" r="2" fill="currentColor"/>
              <circle cx="17" cy="3" r="1.5" fill="currentColor"/>
            </svg>
            <span className="font-semibold text-foreground tracking-tight">
              {t('common.appName')}
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map(({ href, label }) => {
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
        <div className="flex items-center gap-1">

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

          {/* Avatar — always visible when logged in */}
          {user && (
            <Link
              href="/profile"
              title={user.fullName}
              className="group relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-border hover:ring-2 hover:ring-foreground/50 hover:shadow-[0_4px_16px_rgba(0,0,0,0.22)] transition-all flex items-center justify-center bg-muted shrink-0"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                />
              ) : (
                <span className="text-xs font-semibold text-foreground select-none">
                  {user.fullName.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-150" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                  <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v1a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-1c0-3.33-6.67-5-10-5z"/>
                </svg>
              </div>
            </Link>
          )}

          {/* Desktop: divider + sign-out / sign-in buttons */}
          <div className="hidden sm:flex items-center gap-1">
            <div className="w-px h-4 bg-border mx-1" />

            {user ? (
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                {t('common.signOut')}
              </Button>
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
          </div>

          {/* Mobile burger button */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <XIcon /> : <MenuIcon />}
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav className="sm:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-1 animate-fade-in">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'text-foreground font-medium bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {label}
              </Link>
            );
          })}

          <div className="mt-2 pt-2 border-t border-border flex flex-col gap-1">
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <span className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-border bg-muted flex items-center justify-center shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-foreground select-none">
                        {user.fullName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  {user.fullName}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm text-left text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  {t('common.signOut')}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  {t('common.signIn')}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-foreground bg-accent hover:bg-accent/80 transition-colors"
                >
                  {t('common.getStarted')}
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

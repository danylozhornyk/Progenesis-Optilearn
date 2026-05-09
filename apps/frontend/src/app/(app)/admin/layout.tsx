'use client';

/**
 * Admin route-group layout.
 *
 * Inherits authentication from the parent (app) layout — by the time we reach
 * here, `user` is guaranteed non-null. We only need to verify the user is
 * an ADMIN; non-admins are redirected to /dashboard.
 *
 * The page chrome (Header, Footer, side rail) is kept minimal — pages render
 * their own content area inside a shared max-width container.
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { href: '/admin/courses', label: t('admin.nav.courses') },
    { href: '/admin/lessons', label: t('admin.nav.lessons') },
    { href: '/admin/tests',   label: t('admin.nav.tests')   },
    { href: '/admin/users',   label: t('admin.nav.users')   },
    { href: '/admin/stats',   label: t('admin.nav.stats')   },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Sub-tab strip */}
        <div className="flex items-center gap-1 mb-6 border-b border-border overflow-x-auto scrollbar-none">
          {tabs.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-foreground text-foreground font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {children}
      </main>

      <Footer />
    </div>
  );
}

'use client';

import { useT } from '@/lib/i18n';

export default function Footer() {
  const { t } = useT();

  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-center">
        <p className="text-xs text-muted-foreground">
          {t('common.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}

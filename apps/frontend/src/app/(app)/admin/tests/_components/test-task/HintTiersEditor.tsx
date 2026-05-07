'use client';

/**
 * Collapsible per-task hint section. Renders exactly three strength tiers
 * (0/50/100). Empty tiers are dropped on save by the parent's `toApi`.
 * Empty UK tiers fall back to the EN text at runtime.
 */

import { useT } from '@/lib/i18n';
import { HINT_TIERS, HintKey, HintTriplet } from './types';

interface Props {
  hints: HintTriplet;
  hintsUk: HintTriplet;
  locale: 'en' | 'uk';
  onChange: (patch: { hints?: HintTriplet; hintsUk?: HintTriplet }) => void;
}

export function HintTiersEditor({ hints, hintsUk, locale, onChange }: Props) {
  const { t } = useT();
  const isUk = locale === 'uk';

  // Hint tier i18n — resolved at render time so it tracks the active locale
  const hintTierI18n: Record<HintKey, { label: string; blurb: string; placeholder: string; placeholderUk: string }> = {
    weak:   {
      label:         t('admin.testEditor.hintWeak'),
      blurb:         t('admin.testEditor.hintWeakBlurb'),
      placeholder:   t('admin.testEditor.hintWeakPlaceholder'),
      placeholderUk: t('admin.testEditor.hintWeakPlaceholderUk'),
    },
    medium: {
      label:         t('admin.testEditor.hintMedium'),
      blurb:         t('admin.testEditor.hintMediumBlurb'),
      placeholder:   t('admin.testEditor.hintMediumPlaceholder'),
      placeholderUk: t('admin.testEditor.hintMediumPlaceholderUk'),
    },
    strong: {
      label:         t('admin.testEditor.hintStrong'),
      blurb:         t('admin.testEditor.hintStrongBlurb'),
      placeholder:   t('admin.testEditor.hintStrongPlaceholder'),
      placeholderUk: t('admin.testEditor.hintStrongPlaceholderUk'),
    },
  };

  return (
    <details className="rounded-md border border-border bg-muted/10 group" open={
      // Auto-expand when any tier has content in either locale
      HINT_TIERS.some((tier) =>
        hints[tier.key].trim().length > 0 ||
        hintsUk[tier.key].trim().length > 0
      )
    }>
      <summary className="px-3 py-2 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground select-none flex items-center gap-2">
        <span>{t('admin.testEditor.hintsLabel', { locale: locale.toUpperCase() })}</span>
        <span className="text-[10px] text-muted-foreground/70">{t('admin.testEditor.hintsExpand')}</span>
        <span className="ml-auto text-[10px] tabular-nums">
          {t('admin.testEditor.hintsCount', {
            filled: String(HINT_TIERS.filter((tier) => hints[tier.key].trim().length > 0).length),
          })}
        </span>
      </summary>
      <div className="px-3 pb-3 space-y-2">
        <p className="text-[11px] text-muted-foreground">
          {t('admin.testEditor.hintsDescription')}
        </p>
        {HINT_TIERS.map((tier) => {
          const i18n   = hintTierI18n[tier.key];
          const enText = hints[tier.key];
          const ukText = hintsUk[tier.key];
          const value  = isUk ? ukText : enText;
          const onText = (v: string) => onChange(isUk
            ? { hintsUk: { ...hintsUk, [tier.key]: v } }
            : { hints:   { ...hints,   [tier.key]: v } });
          return (
            <div key={tier.key} className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-medium tabular-nums uppercase tracking-wide text-foreground">
                  {tier.strength} — {i18n.label}
                </span>
                <span className="text-[10px] text-muted-foreground italic flex-1 truncate">
                  {i18n.blurb}
                </span>
              </div>
              <textarea
                value={value}
                onChange={(e) => onText(e.target.value)}
                rows={2}
                placeholder={isUk ? i18n.placeholderUk : i18n.placeholder}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
              />
              {isUk && !ukText && enText && (
                <p className="text-[10px] text-muted-foreground/80">
                  {t('admin.testEditor.hintFallback', {
                    text: enText.slice(0, 80) + (enText.length > 80 ? '…' : ''),
                  })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

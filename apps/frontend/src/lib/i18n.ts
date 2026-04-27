'use client';

import { useAuth } from './auth';
import en from '../messages/en.json';
import uk from '../messages/uk.json';

type Messages = typeof en;

const messages: Record<string, Messages> = { en, uk };

function getNestedValue(obj: unknown, path: string): string {
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === 'object' && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return path;
  }, obj) as string;
}

export function useT() {
  const { locale } = useAuth();
  const dict = messages[locale] || messages['en'];

  function t(key: string, params?: Record<string, string | number>): string {
    let value = getNestedValue(dict, key);
    if (typeof value !== 'string') return key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(`{${k}}`, String(v));
      });
    }
    return value;
  }

  return { t, locale };
}

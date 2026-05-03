'use client';

import { useT } from '@/lib/i18n';

// Error codes returned by the backend validatePassword function.
const PASSWORD_ERROR_CODES = [
  'PASSWORD_TOO_SHORT',
  'PASSWORD_NO_UPPERCASE',
  'PASSWORD_NO_LOWERCASE',
  'PASSWORD_NO_DIGIT',
  'PASSWORD_NO_SPECIAL',
] as const;

export type PasswordErrorCode = (typeof PASSWORD_ERROR_CODES)[number];

export function isPasswordErrorCode(msg: string): msg is PasswordErrorCode {
  return (PASSWORD_ERROR_CODES as readonly string[]).includes(msg);
}

// Score 0–5: one point per satisfied rule + bonus for length ≥ 12.
function scorePassword(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8)              s++;
  if (pw.length >= 12)             s++;
  if (/[A-Z]/.test(pw))            s++;
  if (/[a-z]/.test(pw))            s++;
  if (/[0-9]/.test(pw))            s++;
  if (/[^A-Za-z0-9]/.test(pw))    s++;
  return s;
}

// Map score → 0-based level index (0 = weak, 3 = strong).
function scoreToLevel(score: number): 0 | 1 | 2 | 3 {
  if (score <= 1) return 0;
  if (score <= 3) return 1;
  if (score <= 4) return 2;
  return 3;
}

const SEGMENT_COLOURS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-green-500',
];

const LABEL_COLOURS = [
  'text-red-500',
  'text-orange-500',
  'text-yellow-600 dark:text-yellow-500',
  'text-green-600 dark:text-green-400',
];

const LABEL_KEYS = [
  'auth.passwordStrength.weak',
  'auth.passwordStrength.fair',
  'auth.passwordStrength.good',
  'auth.passwordStrength.strong',
] as const;

interface Props {
  password: string;
}

export function PasswordStrengthMeter({ password }: Props) {
  const { t } = useT();
  if (!password) return null;

  const level = scoreToLevel(scorePassword(password));

  return (
    <div className="space-y-1.5 mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= level ? SEGMENT_COLOURS[level] : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-medium ${LABEL_COLOURS[level]}`}>
        {t(LABEL_KEYS[level])}
      </p>
    </div>
  );
}

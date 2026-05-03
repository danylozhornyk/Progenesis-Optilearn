'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  PasswordStrengthMeter,
  isPasswordErrorCode,
} from '@/components/PasswordStrengthMeter';

const passwordRules = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const registerSchema = z
  .object({
    fullName: z.string().min(2).max(200),
    email: z.string().email(),
    password: passwordRules,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

interface RegisterResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isEmailVerified: boolean;
    preferences: Record<string, unknown>;
  };
  token: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useT();
  const [error, setError] = useState('');

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const passwordValue = useWatch({ control: form.control, name: 'password' });

  async function onSubmit(values: RegisterForm) {
    setError('');
    try {
      const data = await api.post<RegisterResponse>('/auth/register', {
        fullName: values.fullName,
        email: values.email,
        password: values.password,
      });
      login(data.token, data.user);
      router.push('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth.register.failed');
      setError(isPasswordErrorCode(msg) ? t(`auth.passwordErrors.${msg}`) : msg);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('auth.register.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('auth.register.subtitle')}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">{t('auth.register.fullName')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('auth.register.fullNamePlaceholder')}
                    autoComplete="name"
                    className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">{t('auth.register.email')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('auth.register.emailPlaceholder')}
                    type="email"
                    autoComplete="email"
                    className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">{t('auth.register.password')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('auth.register.passwordPlaceholder')}
                    type="password"
                    autoComplete="new-password"
                    className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                    {...field}
                  />
                </FormControl>
                <PasswordStrengthMeter password={passwordValue} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">{t('auth.register.confirmPassword')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('auth.register.passwordPlaceholder')}
                    type="password"
                    autoComplete="new-password"
                    className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t('auth.register.creatingAccount') : t('auth.register.createAccount')}
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="divider" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
          {t('auth.register.alreadyHaveAccount')}
        </span>
      </div>

      <Button variant="outline" className="w-full" asChild>
        <Link href="/login">{t('common.signIn')}</Link>
      </Button>
    </div>
  );
}

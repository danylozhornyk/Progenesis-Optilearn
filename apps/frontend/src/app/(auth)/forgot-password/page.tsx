'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

const schema = z.object({ email: z.string().email() });
type ForgotForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { t } = useT();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotForm) {
    await api.post('/auth/forgot-password', values).catch(() => {});
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 dark:text-green-400">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('auth.forgotPassword.checkEmail')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('auth.forgotPassword.checkEmailDescription')}
          </p>
        </div>
        <Link href="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          {t('common.signIn')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('auth.forgotPassword.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('auth.forgotPassword.subtitle')}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">{t('auth.forgotPassword.email')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('auth.forgotPassword.emailPlaceholder')}
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
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.sendResetLink')}
          </Button>
        </form>
      </Form>

      <Link href="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        {t('common.signIn')}
      </Link>
    </div>
  );
}

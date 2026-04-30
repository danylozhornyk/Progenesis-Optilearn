'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_EN: FaqItem[] = [
  {
    q: 'What is Progenesis?',
    a: 'Progenesis is an interactive mathematics learning platform focused on graph theory, numerical methods, and optimization. It uses scaffolded exercises with progressive hints to guide you toward solutions rather than just giving answers.',
  },
  {
    q: 'Do I need an account to browse courses?',
    a: 'You can browse the course catalog without an account. To enroll in a course, submit exercises, and track your progress you will need to register a free account.',
  },
  {
    q: 'How does the hint system work?',
    a: 'Each task comes with a set of hints at different strength levels. The platform picks the most appropriate hint based on your current progress — beginners receive more explicit guidance while advanced learners get subtler nudges.',
  },
  {
    q: 'What difficulty levels are available?',
    a: 'Courses are tagged as Beginner, Intermediate, or Advanced. Within a course, individual tasks are also calibrated so the difficulty ramps up gradually as you progress.',
  },
  {
    q: 'How is my score calculated?',
    a: 'Each test has a maximum possible score. Your progress percentage is the ratio of points you have earned to the maximum points available across all tests you have attempted.',
  },
  {
    q: 'Can I change the language or theme?',
    a: 'Yes. Use the globe icon in the header to switch between English and Ukrainian. Use the sun/moon icon to toggle between light and dark mode. These preferences are saved to your account when logged in, or stored locally when browsing as a guest.',
  },
  {
    q: 'How do I verify my email address?',
    a: 'After registering, a verification link is sent to the email you provided. Click the link to confirm your address. You can request a new link from your profile page if the original expires.',
  },
  {
    q: 'Is my data secure?',
    a: 'Passwords are hashed with bcrypt and never stored in plain text. Authentication uses short-lived JWT tokens. All API communication is handled over HTTPS in production.',
  },
];

const FAQ_UK: FaqItem[] = [
  {
    q: 'Що таке Progenesis?',
    a: 'Progenesis — інтерактивна платформа для вивчення математики з акцентом на теорію графів, чисельні методи та оптимізацію. Система використовує підказки різної сили, щоб направляти вас до правильної відповіді, а не просто давати її.',
  },
  {
    q: 'Чи потрібен акаунт для перегляду курсів?',
    a: 'Каталог курсів доступний без реєстрації. Для запису на курс, виконання завдань та відстеження прогресу необхідно створити безкоштовний акаунт.',
  },
  {
    q: 'Як працює система підказок?',
    a: 'До кожного завдання додається набір підказок різного рівня деталізації. Платформа обирає найбільш відповідну підказку залежно від вашого поточного прогресу — початківці отримують докладніші пояснення, а досвідчені учні — більш завуальовані натяки.',
  },
  {
    q: 'Які рівні складності доступні?',
    a: 'Курси позначаються як Початківець, Середній або Просунутий. Завдання всередині курсу також відкалібровані так, щоб складність поступово зростала.',
  },
  {
    q: 'Як розраховується мій результат?',
    a: 'Кожен тест має максимально можливий бал. Відсоток прогресу — це співвідношення зароблених балів до максимально можливих балів у всіх пройдених тестах.',
  },
  {
    q: 'Чи можна змінити мову або тему оформлення?',
    a: 'Так. Натисніть іконку глобуса в шапці, щоб перемкнутися між англійською та українською. Іконка сонця/місяця перемикає між світлою та темною темою. Налаштування зберігаються у вашому акаунті, а для незареєстрованих користувачів — локально в браузері.',
  },
  {
    q: 'Як підтвердити електронну адресу?',
    a: 'Після реєстрації на вказану пошту надсилається посилання для підтвердження. Перейдіть за посиланням, щоб активувати акаунт. Якщо посилання застаріло, нове можна запросити з вашого профілю.',
  },
  {
    q: 'Чи захищені мої дані?',
    a: 'Паролі зберігаються у вигляді хешу bcrypt і ніколи не зберігаються у відкритому вигляді. Автентифікація використовує короткострокові JWT-токени. Уся комунікація з API у продакшн середовищі здійснюється через HTTPS.',
  },
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function FaqPage() {
  const { t, locale } = useT();
  const items = locale === 'uk' ? FAQ_UK : FAQ_EN;
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 animate-fade-in">

        {/* Page header */}
        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('faq.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('faq.subtitle')}</p>
        </div>

        {/* Accordion */}
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="surface overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-medium text-foreground">{item.q}</span>
                <ChevronIcon open={open === i} />
              </button>

              {open === i && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

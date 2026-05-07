import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Progenesis',
  description: 'Interactive learning for mathematical disciplines',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="theme-transition">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

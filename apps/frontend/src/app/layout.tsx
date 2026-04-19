import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Progenesis',
  description: 'Interactive learning for graph theory, numerical methods, and optimization',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

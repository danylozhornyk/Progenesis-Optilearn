'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** /admin → /admin/stats */
export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/stats');
  }, [router]);
  return null;
}

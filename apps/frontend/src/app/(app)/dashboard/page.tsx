'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function DashboardRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user?.role === 'ADMIN') {
      router.replace('/admin/stats');
    } else {
      router.replace('/profile');
    }
  }, [user, loading, router]);

  return null;
}

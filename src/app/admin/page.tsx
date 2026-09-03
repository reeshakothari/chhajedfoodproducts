'use client';

import dynamic from 'next/dynamic';

// Client-only: relies on Firebase Auth + browser APIs.
const AdminDashboard = dynamic(() => import('./components/AdminDashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-sm font-body text-muted-foreground">
      Loading admin…
    </div>
  ),
});

export default function AdminPage() {
  return <AdminDashboard />;
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin · Chhajed Food Products',
  description: 'Product management console',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}

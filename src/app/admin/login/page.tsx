'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isFirebaseConfigured, signIn, waitForUser } from '@/lib/firebase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    waitForUser().then((user) => {
      if (active && user) router.replace('/admin');
      else if (active) setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace('/admin');
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        setError('Incorrect email or password.');
      } else if (code.includes('too-many-requests')) {
        setError('Too many attempts. Try again in a few minutes.');
      } else {
        setError((err as Error).message || 'Sign in failed.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-warm-lg p-8">
        <div className="text-center mb-6">
          <h1 className="font-headline text-2xl font-bold text-foreground">Admin sign in</h1>
          <p className="font-body text-sm text-muted-foreground mt-1">
            Chhajed Food Products &mdash; product console
          </p>
        </div>

        {!isFirebaseConfigured && (
          <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs font-body text-destructive">
            Firebase Auth is not configured yet. Add the <code>NEXT_PUBLIC_FIREBASE_*</code>{' '}
            environment variables, then redeploy.
          </div>
        )}

        {checking ? (
          <p className="text-center text-sm font-body text-muted-foreground py-6">Checking session&hellip;</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-body font-medium text-muted-foreground mb-1">Email</label>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-muted-foreground mb-1">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && (
              <p className="text-xs font-body text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !isFirebaseConfigured}
              className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-cta font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/homepage" className="text-xs font-body text-muted-foreground hover:text-foreground">
            &larr; Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}

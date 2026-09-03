import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  checkCredentials,
  createSessionToken,
  isAdminAuthConfigured,
  sessionCookieOptions,
} from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!isAdminAuthConfigured) {
    return NextResponse.json(
      { error: 'Admin auth is not configured on the server.' },
      { status: 500 }
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const username = String(body.username || '');
  const password = String(body.password || '');

  if (!checkCredentials(username, password)) {
    return NextResponse.json({ error: 'Incorrect username or password.' }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions);
  return res;
}

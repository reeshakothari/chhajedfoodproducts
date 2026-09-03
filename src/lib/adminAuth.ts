import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

/**
 * Simple single-account admin auth: one username + password held in env vars.
 * A successful login gets a signed, http-only session cookie (HS256 via jose,
 * so it also verifies inside Edge middleware).
 */

export const ADMIN_COOKIE = 'cfp_admin';
const SESSION_DAYS = 7;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || '';

export const isAdminAuthConfigured = Boolean(ADMIN_USERNAME && ADMIN_PASSWORD && SESSION_SECRET);

function secretKey(): Uint8Array {
  return new TextEncoder().encode(SESSION_SECRET);
}

/** Constant-time-ish string compare (avoids early-exit timing leaks). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkCredentials(username: string, password: string): boolean {
  if (!isAdminAuthConfigured) return false;
  return safeEqual(username, ADMIN_USERNAME) && safeEqual(password, ADMIN_PASSWORD);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: 'admin', sub: ADMIN_USERNAME })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined | null): Promise<JWTPayload | null> {
  if (!token || !SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.role === 'admin' ? payload : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

// ---------------------------------------------------------------------------
// Route guard
// ---------------------------------------------------------------------------

export class AdminAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

/** Throws AdminAuthError when the request has no valid admin session. */
export async function requireAdmin(req: Request): Promise<void> {
  if (!isAdminAuthConfigured) {
    throw new AdminAuthError(
      500,
      'Admin auth is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET.'
    );
  }
  const payload = await verifySessionToken(readCookie(req, ADMIN_COOKIE));
  if (!payload) throw new AdminAuthError(401, 'Not signed in.');
}

/** Returns an error Response, or null when authorised. */
export async function guardAdminRoute(
  req: Request
): Promise<Response | null> {
  try {
    await requireAdmin(req);
    return null;
  } catch (err) {
    const status = err instanceof AdminAuthError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Authorization failed.';
    return Response.json({ error: message }, { status });
  }
}

import 'server-only';
import { importX509, jwtVerify, decodeProtectedHeader, type JWTPayload } from 'jose';
import { NextResponse } from 'next/server';

/**
 * Verifies Firebase ID tokens on the server without the firebase-admin SDK.
 * Firebase signs ID tokens with rotating Google keys published as X.509 certs;
 * we fetch + cache those and check the standard issuer/audience claims.
 */

const CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let certCache: { keys: Record<string, string>; expiresAt: number } | null = null;

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (certCache && certCache.expiresAt > Date.now()) return certCache.keys;

  const res = await fetch(CERT_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch Google certs: ${res.status}`);
  const keys = (await res.json()) as Record<string, string>;

  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;

  certCache = { keys, expiresAt: Date.now() + maxAgeSeconds * 1000 };
  return keys;
}

export interface AdminIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
}

export class AdminAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getProjectId(): string {
  const id = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (!id) throw new AdminAuthError(500, 'Server auth is not configured (missing Firebase project id).');
  return id;
}

function getAllowedEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function verifyFirebaseIdToken(token: string): Promise<JWTPayload> {
  const projectId = getProjectId();

  let kid: string | undefined;
  try {
    ({ kid } = decodeProtectedHeader(token));
  } catch {
    throw new AdminAuthError(401, 'Malformed authentication token.');
  }
  if (!kid) throw new AdminAuthError(401, 'Authentication token missing key id.');

  const certs = await getGoogleCerts();
  const pem = certs[kid];
  if (!pem) throw new AdminAuthError(401, 'Authentication token signed with an unknown key.');

  const key = await importX509(pem, 'RS256');

  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    if (!payload.sub) throw new Error('missing sub');
    if (typeof payload.auth_time === 'number' && payload.auth_time * 1000 > Date.now() + 60_000) {
      throw new Error('auth_time in the future');
    }
    return payload;
  } catch {
    throw new AdminAuthError(401, 'Invalid or expired authentication token.');
  }
}

/**
 * Authorise an admin API request. Throws AdminAuthError on any failure.
 * Pass the incoming Request (or a Headers object).
 */
export async function requireAdmin(req: Request | { headers: Headers }): Promise<AdminIdentity> {
  const header = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new AdminAuthError(401, 'Missing authentication token.');

  const payload = await verifyFirebaseIdToken(token);
  const email = String(payload.email || '').toLowerCase();
  const emailVerified = payload.email_verified === true;

  if (!email) throw new AdminAuthError(403, 'This account has no email address.');
  if (!emailVerified) throw new AdminAuthError(403, 'Please verify your email address first.');

  const allowed = getAllowedEmails();
  if (allowed.length === 0) {
    throw new AdminAuthError(
      403,
      'No admin accounts are configured. Set the ADMIN_EMAILS environment variable.'
    );
  }
  if (!allowed.includes(email)) {
    throw new AdminAuthError(403, 'This account is not an authorised admin.');
  }

  return { uid: String(payload.sub), email, emailVerified };
}

/** Convenience wrapper: returns an error NextResponse, or null when authorised. */
export async function guardAdminRoute(
  req: Request
): Promise<{ identity: AdminIdentity; error: null } | { identity: null; error: NextResponse }> {
  try {
    const identity = await requireAdmin(req);
    return { identity, error: null };
  } catch (err) {
    const status = err instanceof AdminAuthError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Authorization failed.';
    return { identity: null, error: NextResponse.json({ error: message }, { status }) };
  }
}

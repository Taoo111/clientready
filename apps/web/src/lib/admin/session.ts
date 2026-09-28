import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Temporary recruiter access (until M4 login): the recruiter enters ADMIN_API_KEY once;
 * an httpOnly cookie keeps a hash of it. Server-side only — the key never reaches the
 * browser, and all API calls are made from the Next.js server.
 */
export const ADMIN_COOKIE = 'cr_admin';
const MAX_AGE_SECONDS = 8 * 60 * 60;

function adminKey(): string | undefined {
  const key = process.env.ADMIN_API_KEY;
  return key && key.length >= 24 ? key : undefined;
}

function digest(value: string): string {
  return createHash('sha256').update(`clientready-admin:${value}`).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function adminEnabled(): boolean {
  return adminKey() !== undefined;
}

export async function isAdmin(): Promise<boolean> {
  const key = adminKey();
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!key && !!cookie && safeEqual(cookie, digest(key));
}

/** Returns true and sets the session cookie when the provided key is correct. */
export async function logIn(provided: string): Promise<boolean> {
  const key = adminKey();
  if (!key || !safeEqual(digest(provided), digest(key))) return false;
  (await cookies()).set(ADMIN_COOKIE, digest(key), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: MAX_AGE_SECONDS,
  });
  return true;
}

export async function logOut(): Promise<void> {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: '/admin' });
}

/** Server-side call to the API's /admin endpoints. */
export function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
  return fetch(`${apiUrl}/admin${path}`, {
    ...init,
    cache: 'no-store',
    headers: { ...init.headers, 'x-admin-key': adminKey() ?? '' },
  });
}

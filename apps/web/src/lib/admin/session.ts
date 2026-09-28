import { RecruiterSchema, type Recruiter } from '@clientready/shared';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Recruiter session (server-side only). The API issues an opaque session token at login;
 * the web app keeps it in an httpOnly cookie and sends it as a Bearer token on every
 * server-side API call. The browser never talks to /admin endpoints directly.
 */
export const SESSION_COOKIE = 'cr_session';

const API_URL = () => process.env.API_URL ?? 'http://localhost:3001';

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function setSession(token: string, expiresAt: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Calls the API without authentication (login). */
export function publicApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL()}${path}`, { ...init, cache: 'no-store' });
}

/** Calls the API as the logged-in recruiter; redirects to the login page when the session is gone. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await sessionToken();
  if (!token) redirect('/admin/login');
  const res = await fetch(`${API_URL()}${path}`, {
    ...init,
    cache: 'no-store',
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) redirect('/admin/login?expired=1');
  return res;
}

/** The logged-in recruiter, or a redirect to the login page. */
export async function requireRecruiter(): Promise<Recruiter> {
  const res = await apiFetch('/auth/me');
  if (!res.ok) redirect('/admin/login?expired=1');
  return RecruiterSchema.parse(await res.json());
}

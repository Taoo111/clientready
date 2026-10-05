import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/admin/session-cookie';

/**
 * Optimistic check only: panel pages without a session cookie go straight to the login
 * page (keeping the requested path). The session itself is validated by the API on every
 * request made by the panel's server components.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL('/admin/login', request.url);
  login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything under /admin except the login page itself.
  matcher: ['/admin', '/admin/((?!login).*)'],
};

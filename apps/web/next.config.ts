import path from 'node:path';
import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

// The single .env for the monorepo lives at the repo root; Next only reads apps/web/.env*.
// Values already set in the environment (e.g. on Vercel) win. NEXT_PUBLIC_* are inlined
// into the browser bundle at build time.
try {
  process.loadEnvFile(path.resolve(process.cwd(), '../../.env'));
} catch {
  // No root .env (Vercel, CI): configuration comes from the environment.
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The conversation needs the microphone on our own origin only.
  { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  transpilePackages: ['@clientready/shared'],
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

// Error monitoring (see src/lib/monitoring.ts). Source maps are uploaded only when
// SENTRY_AUTH_TOKEN (+ SENTRY_ORG, SENTRY_PROJECT) is set on the build machine (Vercel).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
  // Events go through our own domain, so ad blockers do not drop candidates' errors.
  tunnelRoute: '/monitoring',
});

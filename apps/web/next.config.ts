import path from 'node:path';
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

export default nextConfig;

import path from 'node:path';
import type { NextConfig } from 'next';

// The single .env for the monorepo lives at the repo root; Next only reads apps/web/.env*.
// Values already set in the environment win. NEXT_PUBLIC_* are inlined into the browser bundle.
try {
  process.loadEnvFile(path.resolve(process.cwd(), '../../.env'));
} catch {
  // No root .env (e.g. CI or production with real env vars).
}

const nextConfig: NextConfig = {
  transpilePackages: ['@clientready/shared'],
};

export default nextConfig;

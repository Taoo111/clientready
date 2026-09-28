import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Live evaluation against the real provider (costs money): run explicitly with `pnpm test:eval`.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/eval/**/*.eval.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 10 * 60_000,
  },
});

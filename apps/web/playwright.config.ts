import { defineConfig, devices } from '@playwright/test';
import { API_URL, ADMIN, ADMIN_API_KEY, E2E_DATABASE_URL, WEB_URL } from './e2e/env';

/**
 * Browser tests of the real web app against the real API and a separate database
 * (`<db>_ui`, recreated on every run). OpenAI is not called: without an API key the
 * realtime session fails the way it does in production when the service is down.
 */
export default defineConfig({
  testDir: 'e2e',
  // One database for all tests.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    permissions: ['microphone'],
    launchOptions: {
      // A synthetic microphone (a beeping tone) and no permission prompt.
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/start-api.mjs',
      url: `${API_URL}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      env: {
        E2E_DATABASE_URL,
        PORT: new URL(API_URL).port,
        WEB_ORIGIN: WEB_URL,
        ADMIN_EMAIL: ADMIN.email,
        ADMIN_PASSWORD: ADMIN.password,
        ADMIN_API_KEY,
      },
    },
    {
      // A production build: NEXT_PUBLIC_* values are inlined at build time.
      command: `pnpm exec next build && pnpm exec next start --port ${new URL(WEB_URL).port}`,
      url: `${WEB_URL}/admin/login`,
      timeout: 300_000,
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_API_URL: API_URL, API_URL },
    },
  ],
});

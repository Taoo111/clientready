// Error monitoring (Sentry). Imported first in main.ts so it can instrument everything loaded
// after it; that is also why it reads process.env directly (the validated config is not
// loaded yet - SENTRY_DSN is still declared in config/env.ts). Without SENTRY_DSN it is off.
import * as Sentry from '@sentry/nestjs';
import { monitoringPrivacyOptions } from '@clientready/shared';

const dsn = process.env.SENTRY_DSN || undefined;

Sentry.init({
  dsn,
  enabled: dsn !== undefined,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  // Errors only; no performance tracing.
  tracesSampleRate: 0,
  ...monitoringPrivacyOptions,
});

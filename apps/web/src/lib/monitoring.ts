import * as Sentry from '@sentry/nextjs';
import { monitoringPrivacyOptions } from '@clientready/shared';

/**
 * Error monitoring (Sentry) for the browser and the Next.js server. Off unless
 * NEXT_PUBLIC_SENTRY_DSN is set (inlined at build time, like every NEXT_PUBLIC_* value).
 * Nothing personal is sent: see `monitoringPrivacyOptions` in the shared package.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

export function sentryOptions() {
  return {
    dsn,
    enabled: dsn !== undefined,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    // Errors only; no performance tracing or session replay (it would record candidates).
    tracesSampleRate: 0,
    ...monitoringPrivacyOptions,
  };
}

/**
 * Reports a problem the UI already handled (the user saw a friendly message), e.g. a failed
 * realtime connection or recording upload, so we still learn that it happened.
 */
export function reportProblem(
  area: 'realtime' | 'recording' | 'transcript' | 'panel',
  error: unknown,
  level: 'error' | 'warning' = 'error',
): void {
  Sentry.withScope((scope) => {
    scope.setTag('area', area);
    scope.setLevel(level);
    if (error instanceof Error) Sentry.captureException(error);
    else Sentry.captureMessage(`${area}: ${String(error)}`);
  });
}

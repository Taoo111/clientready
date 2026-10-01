import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/monitoring';

/** Server-side error monitoring (Node.js and edge runtimes share the options). */
export function register(): void {
  Sentry.init(sentryOptions());
}

/** Errors thrown while rendering server components, route handlers and server actions. */
export const onRequestError = Sentry.captureRequestError;

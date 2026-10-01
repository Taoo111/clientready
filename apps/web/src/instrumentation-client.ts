import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/monitoring';

/** Browser error monitoring: uncaught errors and unhandled rejections on every page. */
Sentry.init(sentryOptions());

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

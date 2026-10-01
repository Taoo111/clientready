'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import './globals.css';

/**
 * Last-resort error screen when the root layout itself fails (rare). Shown to candidates
 * and recruiters alike, so it is bilingual and has no dependencies on the failed layout.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-background p-6 text-center">
        <div className="max-w-sm space-y-3">
          <h1 className="text-xl font-semibold">Something went wrong / Coś poszło nie tak</h1>
          <p className="text-muted-foreground">Please reload the page. / Odśwież stronę, proszę.</p>
          <button
            type="button"
            className="rounded-lg bg-brand px-4 py-2 font-medium text-brand-foreground"
            onClick={() => window.location.reload()}
          >
            Reload / Odśwież
          </button>
        </div>
      </body>
    </html>
  );
}

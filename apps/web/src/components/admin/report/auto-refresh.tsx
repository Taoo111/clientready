'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const INTERVAL_MS = 10_000;
/** A page left open for long (e.g. overnight) stops polling; a manual reload starts again. */
const MAX_DURATION_MS = 30 * 60_000;

/**
 * Re-renders the server page periodically while the result is pending (conversation running
 * or evaluation in progress), so the report appears without a manual reload. Skips ticks while
 * the tab is hidden.
 */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startedAt > MAX_DURATION_MS) {
        clearInterval(timer);
        return;
      }
      if (document.visibilityState === 'visible') router.refresh();
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);

  return null;
}

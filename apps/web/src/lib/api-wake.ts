'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** After this long without an answer we tell the user the server is starting. */
const SHOW_WAKING_AFTER_MS = 2_500;
/** A free Render instance needs up to ~1 minute to start; give it some margin. */
const GIVE_UP_AFTER_MS = 150_000;
const REQUEST_TIMEOUT_MS = 20_000;
const RETRY_EVERY_MS = 3_000;
/** Free hosting sleeps after 15 min without requests. */
const KEEP_ALIVE_EVERY_MS = 4 * 60_000;

export type ApiWakeState = 'checking' | 'waking' | 'ready' | 'down';

async function healthy(signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Wakes the API (free hosting sleeps after inactivity) and reports progress. Starts on
 * mount; `retry` starts again after `down`. With `keepAlive`, pings periodically so the API
 * does not fall asleep while the page is open.
 */
export function useApiWake(options: { keepAlive?: boolean } = {}): {
  state: ApiWakeState;
  retry: () => void;
} {
  const [state, setState] = useState<ApiWakeState>('checking');
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    const started = Date.now();
    const wakingTimer = setTimeout(() => {
      if (mounted.current) setState((s) => (s === 'checking' ? 'waking' : s));
    }, SHOW_WAKING_AFTER_MS);

    void (async () => {
      while (!controller.signal.aborted) {
        if (await healthy(controller.signal)) {
          if (!controller.signal.aborted) setState('ready');
          return;
        }
        if (Date.now() - started > GIVE_UP_AFTER_MS) {
          if (!controller.signal.aborted) setState('down');
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_EVERY_MS));
      }
    })();

    return () => {
      mounted.current = false;
      controller.abort();
      clearTimeout(wakingTimer);
    };
  }, [attempt]);

  useEffect(() => {
    if (!options.keepAlive) return;
    const timer = setInterval(() => {
      void fetch(`${API_URL}/health`, { cache: 'no-store' }).catch(() => undefined);
    }, KEEP_ALIVE_EVERY_MS);
    return () => clearInterval(timer);
  }, [options.keepAlive]);

  const retry = useCallback(() => {
    setState('checking');
    setAttempt((a) => a + 1);
  }, []);

  return { state, retry };
}

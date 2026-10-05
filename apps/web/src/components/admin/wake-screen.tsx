'use client';

import { RotateCw, ServerCog, ServerOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Logo } from '@/components/brand/logo';
import { Spinner } from '@/components/common/spinner';
import { Button } from '@/components/ui/button';
import { pl } from '@/i18n/pl';
import { useApiWake } from '@/lib/api-wake';

/** Shown when the API is asleep (free hosting): waits for it, then reloads the page. */
export function WakeScreen() {
  const router = useRouter();
  const api = useApiWake();
  const t = pl.wake;

  useEffect(() => {
    if (api.state === 'ready') router.refresh();
  }, [api.state, router]);

  const down = api.state === 'down';
  return (
    <main lang="pl" className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4">
      <Logo />
      <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 text-center shadow-card sm:p-8">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          {down ? (
            <ServerOff className="size-6" aria-hidden />
          ) : (
            <ServerCog className="size-6" aria-hidden />
          )}
        </span>
        <div className="space-y-1" aria-live="polite">
          <h1 className="text-lg font-semibold">{down ? t.downTitle : t.title}</h1>
          <p className="text-sm text-muted-foreground">{down ? t.downBody : t.body}</p>
        </div>
        {down ? (
          <Button onClick={api.retry}>
            <RotateCw aria-hidden />
            {t.retry}
          </Button>
        ) : (
          <Spinner label={t.waiting} />
        )}
      </div>
    </main>
  );
}

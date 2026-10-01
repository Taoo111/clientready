'use client';

import * as Sentry from '@sentry/nextjs';
import { RotateCw, TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { pl } from '@/i18n/pl';

/** Unexpected errors inside the panel (e.g. the API went away mid-request). */
export default function PanelError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <EmptyState
      icon={TriangleAlert}
      title={pl.wake.errorTitle}
      description={pl.wake.errorBody}
      action={
        <Button onClick={reset}>
          <RotateCw aria-hidden />
          {pl.wake.retry}
        </Button>
      }
    />
  );
}

'use client';

import { RotateCw, TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { pl } from '@/i18n/pl';

/** Unexpected errors inside the panel (e.g. the API went away mid-request). */
export default function PanelError({ reset }: { error: Error; reset: () => void }) {
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

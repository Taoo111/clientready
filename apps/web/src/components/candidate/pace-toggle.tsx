'use client';

import type { SpeakingPace } from '@clientready/shared';
import { Snail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { en } from '@/i18n/en';
import { cn } from '@/lib/utils';

/** Lets the candidate slow the client's voice down (and back) at any time; a toggle button. */
export function PaceToggle({
  pace,
  onChange,
  disabled,
}: {
  pace: SpeakingPace;
  onChange: (pace: SpeakingPace) => void;
  disabled?: boolean;
}) {
  const slower = pace === 'slower';
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={slower}
      disabled={disabled}
      onClick={() => onChange(slower ? 'normal' : 'slower')}
      className={cn(slower && 'border-brand/40 bg-brand-soft text-brand-strong')}
    >
      <Snail aria-hidden />
      {en.live.slower}
    </Button>
  );
}

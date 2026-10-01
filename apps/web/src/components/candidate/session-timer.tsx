import { SESSION_HARD_LIMIT_MS, WRAP_UP_AT_MS } from '@clientready/shared';
import { Clock } from 'lucide-react';
import { en } from '@/i18n/en';
import { formatCountdown } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Time left in the conversation; turns amber in the wrap-up minute. */
export function SessionTimer({ remainingMs }: { remainingMs: number }) {
  const elapsed = SESSION_HARD_LIMIT_MS - remainingMs;
  const wrapUp = elapsed >= WRAP_UP_AT_MS;
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-sm shadow-card',
        wrapUp && 'border-warning/30 bg-warning-soft',
      )}
      role="timer"
      aria-live="off"
    >
      <Clock
        className={cn('size-4', wrapUp ? 'text-warning' : 'text-muted-foreground')}
        aria-hidden
      />
      <span className="font-mono font-medium tabular">{formatCountdown(remainingMs)}</span>
      <span className="text-muted-foreground">{en.live.timeLeft}</span>
    </div>
  );
}

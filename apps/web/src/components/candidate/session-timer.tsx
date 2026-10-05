import { Clock } from 'lucide-react';
import { en } from '@/i18n/en';
import { formatCountdown } from '@/lib/format';

/** Time left in the conversation. Deliberately calm: no colour change near the end. */
export function SessionTimer({ remainingMs }: { remainingMs: number }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm" role="timer" aria-live="off">
      <Clock className="size-4 text-muted-foreground" aria-hidden />
      <span className="font-mono font-medium tabular">{formatCountdown(remainingMs)}</span>
      <span className="text-muted-foreground">{en.live.timeLeft}</span>
    </div>
  );
}

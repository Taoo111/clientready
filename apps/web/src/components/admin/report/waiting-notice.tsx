import { Hourglass, Mic } from 'lucide-react';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

const icons = { CREATED: Mic, IN_PROGRESS: Mic, COMPLETED: Hourglass } as const;
export type WaitingStatus = keyof typeof icons;

export function isWaitingStatus(status: string): status is WaitingStatus {
  return status in icons;
}

/** No report yet: the candidate has not talked yet, is talking, or evaluation is running. */
export function WaitingNotice({ status }: { status: WaitingStatus }) {
  const Icon = icons[status];
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-dashed bg-card/60 p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon className={cn('size-5', status === 'COMPLETED' && 'animate-pulse')} aria-hidden />
      </span>
      <p className="text-sm text-muted-foreground">{pl.report.waiting[status]}</p>
    </div>
  );
}

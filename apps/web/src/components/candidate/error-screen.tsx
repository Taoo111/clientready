import { CircleCheck, Clock, Link2Off, MonitorX, RotateCw, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { en } from '@/i18n/en';
import { ApiError } from '@/lib/candidate-api';
import { StatusScreen } from './candidate-shell';

export type ErrorKind = keyof typeof en.errors;

const screens: Record<
  ErrorKind,
  { icon: LucideIcon; tone: 'neutral' | 'warning' | 'success' | 'danger' }
> = {
  notFound: { icon: Link2Off, tone: 'warning' },
  expired: { icon: Clock, tone: 'warning' },
  alreadyCompleted: { icon: CircleCheck, tone: 'success' },
  network: { icon: WifiOff, tone: 'danger' },
  unsupported: { icon: MonitorX, tone: 'warning' },
};

export function errorFor(error: unknown): ErrorKind {
  if (error instanceof ApiError) {
    if (error.code === 'LINK_EXPIRED') return 'expired';
    if (error.code === 'ALREADY_COMPLETED') return 'alreadyCompleted';
    if (error.status === 404) return 'notFound';
  }
  return 'network';
}

/** Full-screen error; network problems get a retry button. */
export function ErrorScreen({ error, onRetry }: { error: ErrorKind; onRetry: () => void }) {
  const message = en.errors[error];
  const screen = screens[error];
  return (
    <StatusScreen icon={screen.icon} tone={screen.tone} title={message.title} body={message.body}>
      {error === 'network' && (
        <Button size="lg" onClick={onRetry}>
          <RotateCw aria-hidden />
          {en.retry}
        </Button>
      )}
    </StatusScreen>
  );
}

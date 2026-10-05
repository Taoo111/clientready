import type { LucideIcon } from 'lucide-react';
import { RotateCw } from 'lucide-react';
import { Notice } from '@/components/common/notice';
import { Button } from '@/components/ui/button';
import { StatusScreen } from './candidate-shell';
import { SessionTimer } from './session-timer';

/**
 * The call is paused (connection dropped, or another app took the microphone): what
 * happened, the time that keeps running, and one button to carry on.
 */
export function PausedScreen({
  icon,
  title,
  body,
  error,
  action,
  onAction,
  remainingMs,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Shown instead of the body when carrying on failed. */
  error?: string;
  /** No button when carrying on is not possible. */
  action?: string;
  onAction: () => void;
  remainingMs: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <SessionTimer remainingMs={remainingMs} />
      </div>
      <StatusScreen icon={icon} tone="warning" title={title} body={error ? undefined : body}>
        {error && (
          <Notice tone="danger" className="text-left">
            {error}
          </Notice>
        )}
        {action && (
          <Button size="lg" className="w-full sm:w-auto" onClick={onAction}>
            <RotateCw aria-hidden />
            {action}
          </Button>
        )}
      </StatusScreen>
    </div>
  );
}

import { Mic } from 'lucide-react';
import { en } from '@/i18n/en';

/** The candidate's own microphone level, so they can see they are heard. */
export function MicLevel({ level }: { level: number }) {
  const percent = Math.round(Math.min(1, level * 1.4) * 100);
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Mic className="size-4" aria-hidden />
      <span
        className="flex h-1.5 w-20 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={en.mic.level}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span
          className="h-full rounded-full bg-success transition-[width] duration-100"
          style={{ width: `${percent}%` }}
        />
      </span>
    </div>
  );
}

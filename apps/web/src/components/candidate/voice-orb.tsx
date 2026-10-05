import { AudioLines, Loader2, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OrbMode = 'ai' | 'you' | 'listening' | 'connecting' | 'idle';

/**
 * Central voice indicator: a flat disc with a thin ring that grows with the audio level;
 * colour and icon show who is speaking. Purely visual - the state is announced next to it.
 */
export function VoiceOrb({
  mode,
  level,
  size = 'lg',
}: {
  mode: OrbMode;
  level: number;
  size?: 'md' | 'lg';
}) {
  const active = mode === 'ai' || mode === 'you';
  const scale = 1 + (active ? Math.min(level, 1) * 0.3 : 0);
  const Icon = mode === 'connecting' ? Loader2 : mode === 'ai' ? AudioLines : Mic;
  const dimension = size === 'lg' ? 'size-40 sm:size-48' : 'size-28';

  return (
    <div className={cn('relative flex items-center justify-center', dimension)} aria-hidden>
      <span
        className={cn(
          'absolute inset-[12%] rounded-full border-2 transition-[transform,border-color] duration-150 ease-out',
          mode === 'ai' && 'border-brand',
          mode === 'you' && 'border-success',
          (mode === 'listening' || mode === 'idle' || mode === 'connecting') && 'border-border',
        )}
        style={{ transform: `scale(${scale})` }}
      />
      <span
        className={cn(
          'relative flex size-[62%] items-center justify-center rounded-full transition-colors duration-300',
          mode === 'ai' && 'bg-brand-strong text-brand-foreground',
          mode === 'you' && 'bg-success text-brand-foreground',
          (mode === 'listening' || mode === 'idle') && 'bg-ink text-ink-foreground',
          mode === 'connecting' && 'bg-muted text-muted-foreground',
        )}
      >
        <Icon
          className={cn('size-1/3', mode === 'connecting' && 'animate-spin')}
          strokeWidth={1.75}
        />
      </span>
    </div>
  );
}

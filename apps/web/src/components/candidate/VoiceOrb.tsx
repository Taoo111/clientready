import { AudioLines, Loader2, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OrbMode = 'ai' | 'you' | 'listening' | 'connecting' | 'idle';

/**
 * Central voice indicator. The halo grows with the current audio level; colour and icon
 * show who is speaking. Purely visual — the state is announced by the text next to it.
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
  const scale = 1 + (active ? Math.min(level, 1) * 0.45 : 0);
  const Icon = mode === 'connecting' ? Loader2 : mode === 'ai' ? AudioLines : Mic;
  const dimension = size === 'lg' ? 'size-40 sm:size-48' : 'size-28';

  return (
    <div className={cn('relative flex items-center justify-center', dimension)} aria-hidden>
      {/* Soft outer halo following the voice */}
      <span
        className={cn(
          'absolute inset-0 rounded-full transition-[transform,background-color] duration-150 ease-out',
          mode === 'ai' && 'bg-brand/15',
          mode === 'you' && 'bg-success/15',
          (mode === 'listening' || mode === 'idle') && 'bg-brand/8',
          mode === 'connecting' && 'bg-muted',
        )}
        style={{ transform: `scale(${scale})` }}
      />
      {/* Gentle breathing ring while listening */}
      {(mode === 'listening' || mode === 'connecting') && (
        <span className="absolute inset-3 animate-ping rounded-full bg-brand/10 [animation-duration:2.4s]" />
      )}
      <span
        className={cn(
          'relative flex size-[62%] items-center justify-center rounded-full shadow-raised transition-colors duration-300',
          mode === 'ai' && 'bg-gradient-to-br from-brand to-brand-strong text-brand-foreground',
          mode === 'you' && 'bg-gradient-to-br from-success to-brand text-brand-foreground',
          (mode === 'listening' || mode === 'idle') &&
            'bg-gradient-to-br from-brand/90 to-brand-strong/90 text-brand-foreground',
          mode === 'connecting' && 'bg-card text-muted-foreground',
        )}
        style={{ transform: `scale(${1 + (active ? Math.min(level, 1) * 0.08 : 0)})` }}
      >
        <Icon
          className={cn('size-1/3', mode === 'connecting' && 'animate-spin')}
          strokeWidth={1.75}
        />
      </span>
    </div>
  );
}

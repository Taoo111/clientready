import type { PersonaCard } from '@clientready/shared';
import { cn } from '@/lib/utils';

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/**
 * The AI client's "portrait": a calm monogram rather than a photo-realistic face, with an
 * always-visible AI badge (the candidate must know it is an AI, see EU AI Act art. 50).
 */
export function ClientPortrait({
  client,
  size = 'lg',
  muted = false,
}: {
  client: PersonaCard;
  size?: 'sm' | 'lg';
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full bg-brand-strong font-semibold tracking-tight text-brand-foreground transition-[filter,opacity] duration-300 select-none',
        size === 'lg' ? 'size-28 text-3xl sm:size-32 sm:text-4xl' : 'size-11 text-base',
        muted && 'opacity-60 grayscale',
      )}
      aria-hidden
    >
      {initials(client.name)}
      <span
        className={cn(
          'absolute rounded-sm border-2 border-card bg-foreground font-mono font-medium text-background',
          size === 'lg'
            ? '-right-0.5 bottom-1 px-1.5 py-0.5 text-[0.65rem]'
            : '-right-1 -bottom-1 px-1 text-[0.55rem]',
        )}
      >
        AI
      </span>
    </span>
  );
}

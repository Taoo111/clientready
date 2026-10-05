import type { PersonaCard } from '@clientready/shared';
import { en } from '@/i18n/en';
import type { PresenceState } from '@/lib/realtime/presence';
import { cn } from '@/lib/utils';
import { ClientPortrait } from './client-portrait';

const labels: Record<PresenceState, string> = {
  connecting: en.live.connecting,
  listening: en.live.listening,
  thinking: en.live.thinking,
  speaking: en.live.clientSpeaking,
  you: en.live.youSpeaking,
};

const dots: Record<PresenceState, string> = {
  connecting: 'bg-muted-foreground/50',
  listening: 'bg-muted-foreground/50',
  thinking: 'bg-brand animate-pulse',
  speaking: 'bg-brand',
  you: 'bg-success',
};

/**
 * The "stage" of the call, like the tile of the other person in a video call: the client's
 * portrait with a thin ring that follows their voice, name card and who is talking.
 */
export function ClientPresence({
  client,
  state,
  aiLevel,
  className,
}: {
  client: PersonaCard;
  state: PresenceState;
  aiLevel: number;
  className?: string;
}) {
  const speaking = state === 'speaking';
  const ring = speaking ? 1.04 + Math.min(aiLevel * 1.6, 1) * 0.14 : 1;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-5 rounded-lg bg-muted px-4 py-10',
        className,
      )}
    >
      <div className="relative flex size-40 items-center justify-center sm:size-44" aria-hidden>
        <span
          className={cn(
            'absolute inset-3 rounded-full border-2 transition-[transform,opacity,border-color] duration-150 ease-out',
            speaking ? 'border-brand opacity-100' : 'border-border opacity-60',
            state === 'connecting' && 'opacity-0',
          )}
          style={{ transform: `scale(${ring})` }}
        />
        <ClientPortrait client={client} muted={state === 'connecting'} />
      </div>

      <div className="space-y-1 text-center">
        <p className="text-lg font-semibold tracking-tight">{client.name}</p>
        <p className="text-sm text-foreground/75">
          {client.title}, {client.company}
        </p>
      </div>

      <p className="inline-flex items-center gap-2 text-sm text-foreground/80" aria-live="polite">
        <span className={cn('size-2 rounded-full', dots[state])} aria-hidden />
        {labels[state]}
      </p>
    </div>
  );
}

import type { PersonaCard } from '@clientready/shared';
import { Mic } from 'lucide-react';
import { en } from '@/i18n/en';
import { cn } from '@/lib/utils';
import { ClientPortrait } from './ClientPortrait';

export type PresenceState = 'connecting' | 'listening' | 'thinking' | 'speaking' | 'you';

const labels: Record<PresenceState, string> = {
  connecting: en.live.connecting,
  listening: en.live.listening,
  thinking: en.live.thinking,
  speaking: en.live.clientSpeaking,
  you: en.live.youSpeaking,
};

/**
 * The client "in the room": portrait with a halo that follows the client's voice, a
 * calm breathing ring while listening, typing-style dots while thinking.
 */
export function ClientPresence({
  client,
  state,
  aiLevel,
  micLevel,
}: {
  client: PersonaCard;
  state: PresenceState;
  aiLevel: number;
  micLevel: number;
}) {
  const halo = state === 'speaking' ? 1 + Math.min(aiLevel * 1.6, 1) * 0.35 : 1;
  const companyLine = [client.title, client.company].join(' · ');

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex size-44 items-center justify-center sm:size-52" aria-hidden>
        <span
          className={cn(
            'absolute inset-2 rounded-full transition-[transform,background-color,opacity] duration-150 ease-out',
            state === 'speaking' ? 'bg-brand/18' : 'bg-brand/8',
            state === 'connecting' && 'opacity-0',
          )}
          style={{ transform: `scale(${halo})` }}
        />
        {(state === 'listening' || state === 'you') && (
          <span className="absolute inset-6 animate-ping rounded-full bg-brand/10 [animation-duration:2.8s]" />
        )}
        <ClientPortrait client={client} muted={state === 'connecting'} />
        {state === 'thinking' && (
          <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full border bg-card px-2.5 py-1.5 shadow-card">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 animate-bounce rounded-full bg-brand"
                style={{ animationDelay: `${i * 150}ms`, animationDuration: '1s' }}
              />
            ))}
          </span>
        )}
      </div>

      <div className="space-y-1 text-center">
        <p className="text-lg font-semibold tracking-tight">{client.name}</p>
        <p className="text-sm text-muted-foreground">{companyLine}</p>
      </div>

      <p
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition-colors',
          state === 'speaking' && 'bg-brand-soft text-brand-strong',
          state === 'you' && 'bg-success-soft text-success',
          (state === 'listening' || state === 'thinking' || state === 'connecting') &&
            'bg-muted text-muted-foreground',
        )}
        aria-live="polite"
      >
        {state === 'you' && <Mic className="size-3.5" aria-hidden />}
        {labels[state]}
      </p>

      {/* The candidate's own level, so they can see the microphone works. */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mic className="size-3.5" aria-hidden />
        <span
          className="flex h-1.5 w-24 overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-label={en.mic.level}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(Math.min(1, micLevel * 1.4) * 100)}
        >
          <span
            className="h-full rounded-full bg-success transition-[width] duration-100"
            style={{ width: `${Math.round(Math.min(1, micLevel * 1.4) * 100)}%` }}
          />
        </span>
      </div>
    </div>
  );
}

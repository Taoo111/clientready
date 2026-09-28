'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { en } from '@/i18n/en';
import { SPEAKING_THRESHOLD } from '@/lib/audio/level-meter';
import type {
  ConversationController,
  ConversationState,
} from '@/lib/realtime/conversation-controller';
import { EndedStep } from './EndedStep';
import { LevelBar } from './LevelBar';

function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
}

function speakingLabel(state: ConversationState): string {
  if (state.aiLevel > SPEAKING_THRESHOLD) return en.live.aiSpeaking;
  if (state.micLevel > SPEAKING_THRESHOLD) return en.live.youSpeaking;
  return en.live.listening;
}

/** Warn before closing the tab while the conversation is running. */
function useLeaveWarning(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = en.live.leaveWarning;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}

export function LiveStep({ controller }: { controller: ConversationController }) {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
  const t = en.live;
  useLeaveWarning(state.phase !== 'ended' || state.upload === 'uploading');

  if (state.phase === 'ended') {
    return <EndedStep timeUp={state.endReason === 'timeUp'} upload={state.upload} />;
  }

  if (state.phase === 'finishing') {
    return (
      <section className="card">
        <p className="muted">{t.finishing}</p>
      </section>
    );
  }

  const timer = (
    <p className="timer" aria-label={t.timeLeft}>
      {t.timeLeft}: <strong>{formatTime(state.remainingMs)}</strong>
    </p>
  );

  if (state.phase === 'dropped') {
    return (
      <section className="card">
        <h1>{t.dropped.title}</h1>
        {timer}
        <p>{state.error ? t.errors[state.error] : t.dropped.body}</p>
        {state.canReconnect && (
          <button type="button" onClick={() => void controller.connect()}>
            {t.dropped.reconnect}
          </button>
        )}
      </section>
    );
  }

  const connecting = state.phase === 'connecting';
  return (
    <section className="card live">
      {timer}
      <p className="speaking" aria-live="polite">
        {connecting ? t.connecting : speakingLabel(state)}
      </p>
      <div className="speakers">
        <div>
          <span>{t.client}</span>
          <LevelBar level={state.aiLevel} label={t.client} active={!connecting} />
        </div>
        <div>
          <span>{t.you}</span>
          <LevelBar level={state.micLevel} label={t.you} active={!connecting} />
        </div>
      </div>
      <button
        type="button"
        className="secondary"
        disabled={connecting}
        onClick={() => {
          if (window.confirm(t.endConfirm)) void controller.endByCandidate();
        }}
      >
        {t.end}
      </button>
    </section>
  );
}

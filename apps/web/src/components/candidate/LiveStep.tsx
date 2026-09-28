'use client';

import { WRAP_UP_AT_MS, SESSION_HARD_LIMIT_MS } from '@clientready/shared';
import { Clock, PhoneOff, RotateCw, WifiOff } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';
import { Notice } from '@/components/common/notice';
import { Spinner } from '@/components/common/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { en } from '@/i18n/en';
import { SPEAKING_THRESHOLD } from '@/lib/audio/level-meter';
import type {
  ConversationController,
  ConversationState,
} from '@/lib/realtime/conversation-controller';
import { cn } from '@/lib/utils';
import { CandidateCard, StatusScreen } from './CandidateShell';
import { EndedStep } from './EndedStep';
import { VoiceOrb, type OrbMode } from './VoiceOrb';

function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
}

function orbState(state: ConversationState): { mode: OrbMode; level: number; label: string } {
  if (state.phase === 'connecting')
    return { mode: 'connecting', level: 0, label: en.live.connecting };
  if (state.aiLevel > SPEAKING_THRESHOLD) {
    return { mode: 'ai', level: state.aiLevel, label: en.live.aiSpeaking };
  }
  if (state.micLevel > SPEAKING_THRESHOLD) {
    return { mode: 'you', level: state.micLevel, label: en.live.youSpeaking };
  }
  return { mode: 'listening', level: 0, label: en.live.listening };
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

function Timer({ remainingMs }: { remainingMs: number }) {
  const elapsed = SESSION_HARD_LIMIT_MS - remainingMs;
  const wrapUp = elapsed >= WRAP_UP_AT_MS;
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-sm shadow-card',
        wrapUp && 'border-warning/30 bg-warning-soft',
      )}
      role="timer"
      aria-live="off"
    >
      <Clock
        className={cn('size-4', wrapUp ? 'text-warning' : 'text-muted-foreground')}
        aria-hidden
      />
      <span className="font-mono font-medium tabular">{formatTime(remainingMs)}</span>
      <span className="text-muted-foreground">{en.live.timeLeft}</span>
    </div>
  );
}

function EndButton({ onConfirm, disabled }: { onConfirm: () => void; disabled?: boolean }) {
  const t = en.live;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          disabled={disabled}
          className="text-danger hover:bg-danger-soft hover:text-danger"
        >
          <PhoneOff aria-hidden />
          {t.end}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.endTitle}</AlertDialogTitle>
          <AlertDialogDescription>{t.endConfirm}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.endCancel}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {t.endAction}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
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
      <CandidateCard className="flex flex-col items-center gap-4 py-12 text-center">
        <Spinner className="size-6" />
        <p className="text-muted-foreground">{t.finishing}</p>
      </CandidateCard>
    );
  }

  if (state.phase === 'dropped') {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <Timer remainingMs={state.remainingMs} />
        </div>
        <StatusScreen
          icon={WifiOff}
          tone="warning"
          title={t.dropped.title}
          body={state.error ? undefined : t.dropped.body}
        >
          {state.error && (
            <Notice tone="danger" className="text-left">
              {t.errors[state.error]}
            </Notice>
          )}
          {state.canReconnect && (
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => void controller.connect()}
            >
              <RotateCw aria-hidden />
              {t.dropped.reconnect}
            </Button>
          )}
        </StatusScreen>
      </div>
    );
  }

  const orb = orbState(state);
  const elapsed = SESSION_HARD_LIMIT_MS - state.remainingMs;

  return (
    <CandidateCard className="flex flex-1 flex-col items-center justify-between gap-8 py-8 text-center sm:min-h-[30rem]">
      <Timer remainingMs={state.remainingMs} />

      <div className="flex flex-col items-center gap-6">
        <VoiceOrb mode={orb.mode} level={orb.level * 1.6} />
        <div className="space-y-1.5" aria-live="polite">
          <p className="text-lg font-medium">{orb.label}</p>
          <p className="text-sm text-muted-foreground">
            {elapsed >= WRAP_UP_AT_MS ? t.wrapUp : t.hint}
          </p>
        </div>
      </div>

      <EndButton
        disabled={state.phase === 'connecting'}
        onConfirm={() => void controller.endByCandidate()}
      />
    </CandidateCard>
  );
}

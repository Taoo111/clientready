'use client';

import {
  SESSION_HARD_LIMIT_MS,
  WRAP_UP_AT_MS,
  type PublicAssessmentView,
} from '@clientready/shared';
import { RotateCw, WifiOff } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';
import { Notice } from '@/components/common/notice';
import { Spinner } from '@/components/common/spinner';
import { Button } from '@/components/ui/button';
import { en } from '@/i18n/en';
import type { ConversationController } from '@/lib/realtime/conversation-controller';
import { CandidateCard, StatusScreen } from './candidate-shell';
import { EndedStep } from './ended-step';
import { ClientPresence } from './client-presence';
import { EndCallButton } from './end-call-button';
import { MicLevel } from './mic-level';
import { PaceToggle } from './pace-toggle';
import { SessionTimer } from './session-timer';

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

export function LiveStep({
  controller,
  view,
}: {
  controller: ConversationController;
  view: PublicAssessmentView;
}) {
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
          <SessionTimer remainingMs={state.remainingMs} />
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

  const elapsed = SESSION_HARD_LIMIT_MS - state.remainingMs;

  return (
    <CandidateCard className="flex flex-1 flex-col gap-4 p-4 sm:min-h-[32rem] sm:p-5">
      <div className="flex items-center justify-between gap-3 px-1">
        <SessionTimer remainingMs={state.remainingMs} />
        <MicLevel level={state.micLevel} />
      </div>

      <ClientPresence
        className="flex-1"
        client={view.client}
        state={state.presence}
        aiLevel={state.aiLevel}
      />

      <p className="px-2 text-center text-sm text-pretty text-muted-foreground">
        {elapsed >= WRAP_UP_AT_MS ? t.wrapUp : t.hint}
      </p>

      {/* Call controls, like the bottom bar of a video call. */}
      <div className="grid gap-3 sm:flex sm:justify-center [&>button]:w-full sm:[&>button]:w-auto">
        <PaceToggle
          pace={state.pace}
          disabled={state.phase === 'connecting'}
          onChange={(pace) => controller.setPace(pace)}
        />
        <EndCallButton
          disabled={state.phase === 'connecting'}
          onConfirm={() => void controller.endByCandidate()}
        />
      </div>
    </CandidateCard>
  );
}

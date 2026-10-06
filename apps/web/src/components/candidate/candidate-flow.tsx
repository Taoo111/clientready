'use client';

import type { PublicAssessmentView } from '@clientready/shared';
import { useCallback, useEffect, useState } from 'react';
import { useApiWake } from '@/lib/api-wake';
import { candidateApi } from '@/lib/candidate-api';
import { ConversationController } from '@/lib/realtime/conversation-controller';
import { CandidateShell } from './candidate-shell';
import { ConsentStep } from './consent-step';
import { errorFor, ErrorScreen, type ErrorKind } from './error-screen';
import { LiveStep } from './live-step';
import { LoadingCard } from './loading-card';
import { MicCheckStep } from './mic-check-step';
import { ReadyStep } from './ready-step';

type Step =
  | { kind: 'loading' }
  | { kind: 'error'; error: ErrorKind }
  | { kind: 'consent'; view: PublicAssessmentView }
  | { kind: 'mic'; view: PublicAssessmentView; resume: boolean }
  | { kind: 'ready'; view: PublicAssessmentView; mic: MediaStream }
  | { kind: 'live'; controller: ConversationController; view: PublicAssessmentView };

function browserSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof RTCPeerConnection !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

async function stepFor(token: string, view: PublicAssessmentView): Promise<Step> {
  if (view.canStart) {
    return view.consentGiven ? { kind: 'mic', view, resume: false } : { kind: 'consent', view };
  }
  if (view.canResume) return { kind: 'mic', view, resume: true };
  if (view.status === 'IN_PROGRESS') {
    // Interrupted with no time left: close it so it can be evaluated.
    await candidateApi.end(token).catch(() => undefined);
  }
  return { kind: 'error', error: 'alreadyCompleted' };
}

export function CandidateFlow({ token }: { token: string }) {
  const [step, setStep] = useState<Step>({ kind: 'loading' });
  // Free hosting sleeps when idle: wake the API first, and keep it awake while the page is open.
  const api = useApiWake({ keepAlive: true });

  const load = useCallback(async () => {
    setStep({ kind: 'loading' });
    if (!browserSupported()) {
      setStep({ kind: 'error', error: 'unsupported' });
      return;
    }
    try {
      setStep(await stepFor(token, await candidateApi.view(token)));
    } catch (error) {
      setStep({ kind: 'error', error: errorFor(error) });
    }
  }, [token]);

  useEffect(() => {
    // Initial data load once the API is up.
    if (api.state === 'ready') void load();
  }, [api.state, load]);

  /**
   * Must run in a click handler: the AudioContext needs a user gesture, and this runs exactly
   * once (an effect could run twice in development).
   */
  function startCall(mic: MediaStream, view: PublicAssessmentView): void {
    const controller = new ConversationController(token, mic);
    void controller.connect();
    setStep({ kind: 'live', controller, view });
  }

  if (api.state === 'down' && step.kind === 'loading') {
    return (
      <CandidateShell>
        <ErrorScreen error="network" onRetry={api.retry} />
      </CandidateShell>
    );
  }

  switch (step.kind) {
    case 'loading':
      return (
        <CandidateShell>
          <LoadingCard waking={api.state === 'waking'} />
        </CandidateShell>
      );

    case 'error':
      return (
        <CandidateShell>
          <ErrorScreen error={step.error} onRetry={() => void load()} />
        </CandidateShell>
      );

    case 'consent':
      return (
        <CandidateShell step={0}>
          <ConsentStep
            view={step.view}
            onAccept={async () => {
              try {
                const view = await candidateApi.consent(token);
                setStep({ kind: 'mic', view, resume: false });
              } catch (error) {
                setStep({ kind: 'error', error: errorFor(error) });
              }
            }}
          />
        </CandidateShell>
      );

    case 'mic':
      return (
        <CandidateShell step={1}>
          <MicCheckStep
            resume={step.resume}
            onReady={(mic) =>
              // A resumed call continues straight away; a new one first shows who is calling.
              step.resume
                ? startCall(mic, step.view)
                : setStep({ kind: 'ready', view: step.view, mic })
            }
          />
        </CandidateShell>
      );

    case 'ready':
      return (
        <CandidateShell step={2}>
          <ReadyStep view={step.view} onStart={() => startCall(step.mic, step.view)} />
        </CandidateShell>
      );

    case 'live':
      return (
        <CandidateShell step={2}>
          <LiveStep controller={step.controller} view={step.view} />
        </CandidateShell>
      );
  }
}

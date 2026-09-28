'use client';

import type { PublicAssessmentView } from '@clientready/shared';
import { useCallback, useEffect, useState } from 'react';
import { en } from '@/i18n/en';
import { ApiError, candidateApi } from '@/lib/candidate-api';
import { ConversationController } from '@/lib/realtime/conversation-controller';
import { ConsentStep } from './ConsentStep';
import { LiveStep } from './LiveStep';
import { MessageCard } from './MessageCard';
import { MicCheckStep } from './MicCheckStep';

type Step =
  | { kind: 'loading' }
  | { kind: 'error'; error: keyof typeof en.errors }
  | { kind: 'consent'; view: PublicAssessmentView }
  | { kind: 'mic'; view: PublicAssessmentView; resume: boolean }
  | { kind: 'live'; controller: ConversationController };

function errorFor(error: unknown): keyof typeof en.errors {
  if (error instanceof ApiError) {
    if (error.code === 'LINK_EXPIRED') return 'expired';
    if (error.code === 'ALREADY_COMPLETED') return 'alreadyCompleted';
    if (error.status === 404) return 'notFound';
  }
  return 'network';
}

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
    // Initial data load from the API on mount.
    void load();
  }, [load]);

  switch (step.kind) {
    case 'loading':
      return <p className="muted">{en.loading}</p>;

    case 'error': {
      const message = en.errors[step.error];
      return (
        <MessageCard title={message.title} body={message.body}>
          {step.error === 'network' && (
            <button type="button" onClick={() => void load()}>
              {en.retry}
            </button>
          )}
        </MessageCard>
      );
    }

    case 'consent':
      return (
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
      );

    case 'mic':
      return (
        <MicCheckStep
          resume={step.resume}
          onReady={(mic) => {
            // Created in the click handler: the AudioContext needs a user gesture, and this
            // runs exactly once (an effect could run twice in development).
            const controller = new ConversationController(token, mic);
            void controller.connect();
            setStep({ kind: 'live', controller });
          }}
        />
      );

    case 'live':
      return <LiveStep controller={step.controller} />;
  }
}

'use client';

import type { PublicAssessmentView } from '@clientready/shared';
import { CircleCheck, Clock, Link2Off, MonitorX, RotateCw, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/common/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { en } from '@/i18n/en';
import { useApiWake } from '@/lib/api-wake';
import { ApiError, candidateApi } from '@/lib/candidate-api';
import { ConversationController } from '@/lib/realtime/conversation-controller';
import { CandidateCard, CandidateShell, StatusScreen } from './CandidateShell';
import { ConsentStep } from './ConsentStep';
import { LiveStep } from './LiveStep';
import { MicCheckStep } from './MicCheckStep';

type ErrorKind = keyof typeof en.errors;

type Step =
  | { kind: 'loading' }
  | { kind: 'error'; error: ErrorKind }
  | { kind: 'consent'; view: PublicAssessmentView }
  | { kind: 'mic'; view: PublicAssessmentView; resume: boolean }
  | { kind: 'live'; controller: ConversationController; view: PublicAssessmentView };

const errorScreens: Record<
  ErrorKind,
  { icon: LucideIcon; tone: 'neutral' | 'warning' | 'success' | 'danger' }
> = {
  notFound: { icon: Link2Off, tone: 'warning' },
  expired: { icon: Clock, tone: 'warning' },
  alreadyCompleted: { icon: CircleCheck, tone: 'success' },
  network: { icon: WifiOff, tone: 'danger' },
  unsupported: { icon: MonitorX, tone: 'warning' },
};

function errorFor(error: unknown): ErrorKind {
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

function LoadingCard({ waking }: { waking: boolean }) {
  return (
    <CandidateCard className="space-y-4" aria-busy="true">
      {waking && (
        <div className="flex items-start gap-3 rounded-2xl bg-brand-soft/70 p-4 text-sm">
          <Spinner className="mt-0.5 text-brand" />
          <div className="space-y-0.5">
            <p className="font-medium">{en.preparing.title}</p>
            <p className="text-muted-foreground">{en.preparing.body}</p>
          </div>
        </div>
      )}
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="space-y-3 pt-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-11 w-full rounded-lg" />
    </CandidateCard>
  );
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

  if (api.state === 'down' && step.kind === 'loading') {
    const message = en.errors.network;
    return (
      <CandidateShell>
        <StatusScreen icon={WifiOff} tone="danger" title={message.title} body={message.body}>
          <Button size="lg" onClick={api.retry}>
            <RotateCw aria-hidden />
            {en.retry}
          </Button>
        </StatusScreen>
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

    case 'error': {
      const message = en.errors[step.error];
      const screen = errorScreens[step.error];
      return (
        <CandidateShell>
          <StatusScreen
            icon={screen.icon}
            tone={screen.tone}
            title={message.title}
            body={message.body}
          >
            {step.error === 'network' && (
              <Button size="lg" onClick={() => void load()}>
                <RotateCw aria-hidden />
                {en.retry}
              </Button>
            )}
          </StatusScreen>
        </CandidateShell>
      );
    }

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
            onReady={(mic) => {
              // Created in the click handler: the AudioContext needs a user gesture, and this
              // runs exactly once (an effect could run twice in development).
              const controller = new ConversationController(token, mic);
              void controller.connect();
              setStep({ kind: 'live', controller, view: step.view });
            }}
          />
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

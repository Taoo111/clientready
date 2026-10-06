'use client';

import type { PublicAssessmentView } from '@clientready/shared';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { en } from '@/i18n/en';
import { CandidateCard } from './candidate-shell';
import { ClientPortrait } from './client-portrait';

/**
 * A moment between the microphone check and the call: who is about to call, what to expect,
 * and a deliberate "Start the call" (the timer starts on that click).
 */
export function ReadyStep({ view, onStart }: { view: PublicAssessmentView; onStart: () => void }) {
  const t = en.ready;
  const clientFirstName = view.client.name.trim().split(/\s+/)[0] ?? view.client.name;

  return (
    <CandidateCard className="flex flex-col items-center gap-6 text-center">
      <ClientPortrait client={view.client} />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {t.title(clientFirstName)}
        </h1>
        <p className="text-sm text-foreground/75">
          {view.client.name} · {view.client.title}, {view.client.company}
        </p>
      </div>

      <div className="w-full space-y-3 text-left">
        <p className="text-[1.05rem] text-pretty text-foreground/85">{t.intro(clientFirstName)}</p>
        <ul className="list-disc space-y-1.5 pl-5 text-[0.95rem] text-foreground/80 marker:text-border">
          {t.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      <Button size="lg" className="w-full" onClick={onStart}>
        <Phone aria-hidden />
        {t.start}
      </Button>
    </CandidateCard>
  );
}

'use client';

import type { PublicAssessmentView } from '@clientready/shared';
import { ArrowRight, Bot, Lightbulb, Mic, ShieldCheck, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { Spinner } from '@/components/common/spinner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { en } from '@/i18n/en';
import { brand } from '@/lib/brand';
import { CandidateCard } from './CandidateShell';
import { ClientPortrait } from './ClientPortrait';

const pointIcons = [Bot, Mic, UserCheck, ShieldCheck];

export function ConsentStep({
  view,
  onAccept,
}: {
  view: PublicAssessmentView;
  onAccept: () => Promise<void>;
}) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const t = en.consent;
  const firstName = view.candidateName.trim().split(/\s+/)[0] ?? view.candidateName;

  return (
    <CandidateCard className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{t.title(firstName)}</h1>
        <p className="text-pretty text-muted-foreground">
          {t.intro(view.roleName, brand.customerName)}
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border bg-background/60 p-4">
        <ClientPortrait client={view.client} size="sm" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs text-muted-foreground">{t.talkingTo}</p>
          <p className="font-medium">
            {view.client.name}
            <span className="font-normal text-muted-foreground">
              {' '}
              · {view.client.title}, {view.client.company}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">{t.aiCharacter}</p>
        </div>
      </div>

      <ul className="space-y-4">
        {t.points.map((point, index) => {
          const Icon = pointIcons[index] ?? Bot;
          return (
            <li key={point.title} className="flex gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <div className="space-y-0.5 pt-0.5">
                <p className="font-medium">{point.title}</p>
                <p className="text-sm text-pretty text-muted-foreground">{point.body}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl bg-muted/70 p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Lightbulb className="size-4 text-warning" aria-hidden />
          {t.tipsTitle}
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground marker:text-border">
          {t.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>

      <label
        htmlFor="consent"
        className="flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-brand/50 has-[[data-state=checked]]:bg-brand-soft/60"
      >
        <Checkbox
          id="consent"
          checked={checked}
          onCheckedChange={(value) => setChecked(value === true)}
          className="mt-0.5 size-5"
        />
        <span className="text-sm leading-relaxed">{t.checkbox}</span>
      </label>

      <Button
        size="lg"
        className="w-full"
        disabled={!checked || submitting}
        onClick={async () => {
          setSubmitting(true);
          await onAccept();
          setSubmitting(false);
        }}
      >
        {submitting ? <Spinner className="text-current" /> : null}
        {t.continue}
        {!submitting && <ArrowRight aria-hidden />}
      </Button>
    </CandidateCard>
  );
}

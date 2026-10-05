'use client';

import type { PublicAssessmentView } from '@clientready/shared';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Spinner } from '@/components/common/spinner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { en } from '@/i18n/en';
import { brand } from '@/lib/brand';
import { CandidateCard } from './candidate-shell';
import { ClientPortrait } from './client-portrait';

/** Consent, framed like an invitation to a call: who, how long, recorded, AI. */
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
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-[1.75rem]">
          {t.title(firstName)}
        </h1>
        <p className="text-[1.05rem] text-pretty text-foreground/80">
          {t.intro(view.roleName, brand.customerName)}
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
        <ClientPortrait client={view.client} size="sm" />
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">{t.callWith(view.client.name)}</p>
          <p className="text-sm text-foreground/80">
            {view.client.title}, {view.client.company}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{t.callFacts.join(' · ')}</p>
        </div>
      </div>

      <ul className="space-y-3 text-[0.95rem] leading-relaxed">
        {t.points.map((point) => (
          <li key={point.title}>
            <span className="font-semibold">{point.title}.</span>{' '}
            <span className="text-foreground/80">{point.body}</span>
          </li>
        ))}
      </ul>

      <label
        htmlFor="consent"
        className="flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-ink/40"
      >
        <Checkbox
          id="consent"
          checked={checked}
          onCheckedChange={(value) => setChecked(value === true)}
          className="mt-0.5 size-5"
        />
        <span className="text-sm leading-relaxed">{t.checkbox}</span>
      </label>

      <div className="space-y-3">
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
        <p className="text-center text-sm text-pretty text-muted-foreground">{t.tip}</p>
      </div>
    </CandidateCard>
  );
}

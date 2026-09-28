'use client';

import type { CriterionResult } from '@clientready/shared';
import { ChevronDown, CircleAlert, Quote } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

function scoreTone(score: number): string {
  if (score >= 4) return 'bg-success';
  if (score === 3) return 'bg-brand';
  if (score === 2) return 'bg-warning';
  return 'bg-danger';
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex flex-1 gap-1"
        role="meter"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={score}
        aria-label={`${score}/5`}
      >
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className={cn('h-2 flex-1 rounded-full', step <= score ? scoreTone(score) : 'bg-muted')}
          />
        ))}
      </div>
      <span className="w-9 text-right text-sm font-semibold tabular">{score}/5</span>
    </div>
  );
}

function Criterion({ criterion }: { criterion: CriterionResult }) {
  const [open, setOpen] = useState(false);
  const t = pl.report;
  const count = criterion.evidence.length;
  return (
    <li className="print-avoid-break space-y-3 py-5 first:pt-0 last:pb-0">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center sm:gap-6">
        <h3 className="font-medium">{pl.criteria[criterion.key] ?? criterion.name}</h3>
        <ScoreBar score={criterion.score} />
      </div>
      <p className="text-sm leading-relaxed text-foreground/85">{criterion.comment}</p>

      {count === 0 ? (
        <p className="flex items-center gap-2 text-sm text-warning">
          <CircleAlert className="size-4" aria-hidden />
          {t.noEvidence}
        </p>
      ) : (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="print-hidden inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-brand hover:text-brand-strong focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <ChevronDown
              className={cn('size-4 transition-transform', open && 'rotate-180')}
              aria-hidden
            />
            {open ? t.evidenceHide : t.evidenceShow(count)}
          </CollapsibleTrigger>
          {/* Always rendered so the quotes appear in the printed report. */}
          <CollapsibleContent forceMount className="data-[state=closed]:hidden print:!block">
            <ul className="mt-3 space-y-2">
              {criterion.evidence.map((e) => (
                <li
                  key={`${e.seq}-${e.quote}`}
                  className="flex gap-3 rounded-lg border-l-2 border-brand/50 bg-muted/50 py-2 pr-3 pl-3"
                >
                  <Quote className="mt-0.5 size-3.5 shrink-0 text-brand/70" aria-hidden />
                  <div className="min-w-0 flex-1 text-sm">
                    <q className="italic">{e.quote}</q>{' '}
                    <a
                      href={`#turn-${e.seq}`}
                      className="print-hidden ml-1 text-xs whitespace-nowrap text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      {t.goToTurn} →
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
      {criterion.rejectedQuotes > 0 && (
        <p className="print-hidden text-xs text-muted-foreground">
          {t.rejectedQuotes(criterion.rejectedQuotes)}
        </p>
      )}
    </li>
  );
}

export function CriteriaList({ criteria }: { criteria: CriterionResult[] }) {
  return (
    <ul className="divide-y">
      {criteria.map((c) => (
        <Criterion key={c.key} criterion={c} />
      ))}
    </ul>
  );
}

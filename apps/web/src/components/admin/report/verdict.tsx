import type { Report } from '@clientready/shared';
import { CircleCheck, CircleDashed, CircleX, ShieldCheck, TriangleAlert } from 'lucide-react';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

const t = pl.report;

const verdictStyles = {
  READY: { icon: CircleCheck, box: 'border-success/30 bg-success-soft', text: 'text-success' },
  READY_WITH_CONCERNS: {
    icon: TriangleAlert,
    box: 'border-warning/35 bg-warning-soft',
    text: 'text-warning',
  },
  NOT_READY: { icon: CircleX, box: 'border-danger/30 bg-danger-soft', text: 'text-danger' },
} as const;

/** The recommendation with its summary, or why there was not enough data for one. */
export function Verdict({ report }: { report: Report }) {
  if (report.status === 'INSUFFICIENT_DATA') {
    return (
      <section className="print-avoid-break rounded-2xl border bg-muted p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <CircleDashed className="mt-0.5 size-8 shrink-0 text-muted-foreground" aria-hidden />
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t.recommendationLabel}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">{t.insufficientTitle}</h2>
            <p className="leading-relaxed text-foreground/85">{report.insufficientReason}</p>
          </div>
        </div>
      </section>
    );
  }

  const recommendation = report.recommendation ?? 'READY_WITH_CONCERNS';
  const style = verdictStyles[recommendation];
  const Icon = style.icon;
  return (
    <section className={cn('print-avoid-break rounded-2xl border p-5 sm:p-7', style.box)}>
      <div className="flex items-start gap-4">
        <Icon className={cn('mt-1 size-9 shrink-0', style.text)} aria-hidden />
        <div className="min-w-0 space-y-3">
          <p className="text-xs font-medium tracking-wide text-foreground/60 uppercase">
            {t.recommendationLabel}
          </p>
          <h2 className={cn('text-2xl font-semibold tracking-tight sm:text-3xl', style.text)}>
            {pl.recommendation[recommendation]}
          </h2>
          <p className="max-w-3xl leading-relaxed text-foreground/90">{report.summary}</p>
          {report.modelRecommendation && report.modelRecommendation !== report.recommendation && (
            <p className="text-sm text-foreground/70">
              {t.modelDisagrees(pl.recommendation[report.modelRecommendation])}
            </p>
          )}
          <p className="flex items-start gap-2 border-t border-foreground/10 pt-3 text-sm text-foreground/70">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t.humanDecision}
          </p>
        </div>
      </div>
    </section>
  );
}

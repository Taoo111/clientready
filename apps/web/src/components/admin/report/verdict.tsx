import type { Recommendation, Report } from '@clientready/shared';
import { ShieldCheck } from 'lucide-react';
import { pl } from '@/i18n/pl';
import { keyEvidence } from '@/lib/report/key-evidence';
import { cn } from '@/lib/utils';

const t = pl.report;

const dot: Record<Recommendation, string> = {
  READY: 'bg-success',
  READY_WITH_CONCERNS: 'bg-warning',
  NOT_READY: 'bg-danger',
};

/**
 * The AI recommendation as a calm heading with a small colour marker - not a full green or
 * red banner, which anchors the recruiter before they see any evidence (automation bias).
 * The quotes behind the weakest and the strongest criterion sit right next to it.
 */
export function Verdict({ report }: { report: Report }) {
  if (report.status === 'INSUFFICIENT_DATA') {
    return (
      <section className="print-avoid-break space-y-2 rounded-xl border bg-card p-5 sm:p-6">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          {t.recommendationLabel}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">{t.insufficientTitle}</h2>
        <p className="leading-relaxed text-foreground/85">{report.insufficientReason}</p>
      </section>
    );
  }

  const recommendation = report.recommendation ?? 'READY_WITH_CONCERNS';
  const evidence = keyEvidence(report.criteria);
  return (
    <section className="print-avoid-break space-y-5 rounded-xl border bg-card p-5 shadow-card sm:p-7">
      <div className="space-y-3">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          {t.recommendationLabel}
        </p>
        <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className={cn('size-3 shrink-0 rounded-full', dot[recommendation])} aria-hidden />
          {pl.recommendation[recommendation]}
        </h2>
        <p className="max-w-3xl leading-relaxed text-foreground/90">{report.summary}</p>
      </div>

      {evidence.length > 0 && (
        <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
          {evidence.map((e) => (
            <figure key={e.kind} className="min-w-0 space-y-1.5">
              <figcaption className="font-mono text-xs text-muted-foreground">
                {t.keyEvidence[e.kind]} · {pl.criteria[e.criterionKey] ?? e.criterionName} ·{' '}
                {e.score}/5
              </figcaption>
              <blockquote className="text-sm leading-relaxed">
                <mark className="rounded-[2px] bg-marker px-0.5 text-foreground">„{e.quote}”</mark>{' '}
                <a
                  href={`#turn-${e.seq}`}
                  className="print-hidden text-xs whitespace-nowrap text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  {t.goToTurn} →
                </a>
              </blockquote>
            </figure>
          ))}
        </div>
      )}

      <div className="space-y-2 border-t pt-4 text-sm text-foreground/70">
        {report.modelRecommendation && report.modelRecommendation !== report.recommendation && (
          <p>{t.modelDisagrees(pl.recommendation[report.modelRecommendation])}</p>
        )}
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t.humanDecision}
        </p>
      </div>
    </section>
  );
}

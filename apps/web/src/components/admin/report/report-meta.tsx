import type { AdminAssessmentDetail, Report } from '@clientready/shared';
import { pl } from '@/i18n/pl';
import { formatDateTime } from '@/lib/format';

const t = pl.report;

/** How the report was produced (model, prompt version) and basic conversation stats. */
export function ReportMeta({
  stored,
  report,
}: {
  stored: NonNullable<AdminAssessmentDetail['report']>;
  report: Report;
}) {
  const rows = [
    [t.meta.model, `${stored.provider} / ${stored.model}`],
    [t.meta.promptVersion, stored.promptVersion],
    [t.meta.evaluatedAt, formatDateTime(stored.createdAt)],
    [t.meta.conversationLength, t.minutes(report.stats.conversationMs)],
    [t.meta.candidateSpeech, t.minutes(report.stats.candidateSpeechMs)],
    [t.meta.candidateTurns, String(report.stats.candidateTurns)],
  ];
  return (
    <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 border-b border-dashed pb-2">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

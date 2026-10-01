import type { AdminAssessmentDetail } from '@clientready/shared';
import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/admin/badges';
import { Logo } from '@/components/brand/logo';
import { pl } from '@/i18n/pl';
import { formatClock, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ReportActions } from './report-actions';

const t = pl.report;

/** Candidate name, role/level/date facts and the recruiter's actions (+ print letterhead). */
export function ReportHeader({
  detail,
  finished,
  hasReport,
}: {
  detail: AdminAssessmentDetail;
  finished: boolean;
  hasReport: boolean;
}) {
  const deleted = detail.dataDeletedAt !== null;
  const durationMs =
    detail.startedAt && detail.endedAt
      ? new Date(detail.endedAt).getTime() - new Date(detail.startedAt).getTime()
      : null;

  return (
    <>
      {/* Print-only letterhead */}
      <div className="hidden items-center justify-between border-b pb-3 print:flex">
        <Logo />
        <span className="text-xs text-muted-foreground">
          {t.printedAt(formatDateTime(new Date().toISOString()))}
        </span>
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={detail.status} deleted={deleted} className="print-hidden" />
          </div>
          <h1
            className={cn(
              'text-2xl font-semibold tracking-tight break-words sm:text-3xl',
              deleted && 'text-muted-foreground italic',
            )}
          >
            {detail.candidateName}
          </h1>
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Fact label={t.role}>{detail.roleName}</Fact>
            <Fact label={t.targetLevel}>
              <span className="font-mono">{detail.targetLevel}</span>
            </Fact>
            <Fact label={detail.startedAt ? t.conversationDate : t.created}>
              {formatDateTime(detail.startedAt ?? detail.createdAt)}
            </Fact>
            {durationMs !== null && (
              <Fact label={t.duration}>
                <span className="tabular">{formatClock(durationMs)}</span>
              </Fact>
            )}
          </dl>
        </div>
        <ReportActions
          assessmentId={detail.id}
          canRerun={finished && !deleted}
          canPrint={hasReport}
          canDelete={!deleted}
        />
      </header>
    </>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd>{children}</dd>
    </div>
  );
}

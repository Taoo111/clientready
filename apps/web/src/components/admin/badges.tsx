import type {
  AdminAssessmentListItem,
  AssessmentStatus,
  Recommendation,
  ReportStatus,
} from '@clientready/shared';
import { UserCheck } from 'lucide-react';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Status as a small dot + text: readable in a dense list, colour only reinforces the label. */
const label = 'inline-flex items-center gap-2 text-sm whitespace-nowrap';
const dotBase = 'size-2 shrink-0 rounded-full';

const statusDot: Record<AssessmentStatus, string> = {
  CREATED: 'border border-muted-foreground/60',
  IN_PROGRESS: 'bg-info',
  COMPLETED: 'bg-warning',
  EVALUATED: 'bg-success',
  FAILED: 'bg-danger',
};

export function StatusBadge({
  status,
  deleted = false,
  className,
}: {
  status: AssessmentStatus;
  deleted?: boolean;
  className?: string;
}) {
  if (deleted) {
    return (
      <span className={cn(label, 'text-muted-foreground', className)}>
        <span className={cn(dotBase, 'bg-muted-foreground/40')} aria-hidden />
        {pl.dataDeleted}
      </span>
    );
  }
  return (
    <span className={cn(label, className)}>
      <span className={cn(dotBase, statusDot[status])} aria-hidden />
      {pl.status[status]}
    </span>
  );
}

const recommendationDot: Record<Recommendation, string> = {
  READY: 'bg-success',
  READY_WITH_CONCERNS: 'bg-warning',
  NOT_READY: 'bg-danger',
};

export function RecommendationBadge({
  recommendation,
  reportStatus,
  className,
}: {
  recommendation: Recommendation | null;
  reportStatus?: ReportStatus | null;
  className?: string;
}) {
  if (reportStatus === 'INSUFFICIENT_DATA') {
    return (
      <span className={cn(label, 'text-muted-foreground', className)}>
        <span className={cn(dotBase, 'border border-muted-foreground/60')} aria-hidden />
        {pl.insufficientShort}
      </span>
    );
  }
  if (!recommendation) return <span className="text-sm text-muted-foreground">-</span>;
  return (
    <span className={cn(label, className)}>
      <span className={cn(dotBase, recommendationDot[recommendation])} aria-hidden />
      {pl.recommendation[recommendation]}
    </span>
  );
}

/**
 * The recruiter's decision on the current report, or "to review" when a recommendation is
 * waiting for a human decision. Nothing to show before there is a recommendation.
 */
export function DecisionBadge({
  item,
  className,
}: {
  item: Pick<AdminAssessmentListItem, 'decision' | 'recommendation'>;
  className?: string;
}) {
  if (item.decision) {
    const differs = !item.decision.agreesWithAi;
    return (
      <span
        className={cn(label, className)}
        title={differs ? pl.list.differsFromAiTitle : undefined}
      >
        <UserCheck className="size-3.5 text-muted-foreground" aria-hidden />
        {pl.recommendation[item.decision.verdict]}
        {differs && <span className="font-medium text-warning">{pl.list.differsFromAi}</span>}
      </span>
    );
  }
  if (item.recommendation) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-md bg-warning-soft px-2 py-0.5 text-sm font-medium whitespace-nowrap text-foreground',
          className,
        )}
      >
        {pl.list.toReview}
      </span>
    );
  }
  return <span className="text-sm text-muted-foreground">-</span>;
}

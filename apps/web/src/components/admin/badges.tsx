import type { AssessmentStatus, Recommendation, ReportStatus } from '@clientready/shared';
import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Hourglass,
  Mic,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

const pill =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5';

const statusStyles: Record<AssessmentStatus, { className: string; icon: typeof Clock }> = {
  CREATED: { className: 'border-border bg-muted text-muted-foreground', icon: Clock },
  IN_PROGRESS: { className: 'border-info/20 bg-info-soft text-info', icon: Mic },
  COMPLETED: { className: 'border-warning/25 bg-warning-soft text-warning', icon: Hourglass },
  EVALUATED: { className: 'border-success/20 bg-success-soft text-success', icon: CircleCheck },
  FAILED: { className: 'border-danger/20 bg-danger-soft text-danger', icon: CircleX },
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
      <span className={cn(pill, 'border-border bg-muted text-muted-foreground', className)}>
        <Trash2 aria-hidden />
        {pl.dataDeleted}
      </span>
    );
  }
  const { className: tone, icon: Icon } = statusStyles[status];
  return (
    <span className={cn(pill, tone, className)}>
      <Icon aria-hidden />
      {pl.status[status]}
    </span>
  );
}

export const recommendationTone: Record<Recommendation, 'success' | 'warning' | 'danger'> = {
  READY: 'success',
  READY_WITH_CONCERNS: 'warning',
  NOT_READY: 'danger',
};

const recommendationStyles: Record<Recommendation, { className: string; icon: typeof Clock }> = {
  READY: { className: 'border-success/25 bg-success-soft text-success', icon: CircleCheck },
  READY_WITH_CONCERNS: {
    className: 'border-warning/30 bg-warning-soft text-warning',
    icon: TriangleAlert,
  },
  NOT_READY: { className: 'border-danger/25 bg-danger-soft text-danger', icon: CircleX },
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
      <span className={cn(pill, 'border-border bg-muted text-muted-foreground', className)}>
        <CircleDashed aria-hidden />
        {pl.insufficientShort}
      </span>
    );
  }
  if (!recommendation) return <span className="text-sm text-muted-foreground">—</span>;
  const { className: tone, icon: Icon } = recommendationStyles[recommendation];
  return (
    <span className={cn(pill, tone, className)}>
      <Icon aria-hidden />
      {pl.recommendation[recommendation]}
    </span>
  );
}

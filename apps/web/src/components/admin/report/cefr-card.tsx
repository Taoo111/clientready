import { cefrRank, type CefrLevel, type TargetLevel } from '@clientready/shared';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** One CEFR estimate; the comparison with the target level is a small note, not a big colour. */
export function CefrCard({
  label,
  level,
  justification,
  target,
}: {
  label: string;
  level: CefrLevel;
  justification: string;
  target: TargetLevel;
}) {
  const diff = cefrRank(level) - cefrRank(target);
  const tone = diff >= 0 ? 'text-success' : diff === -1 ? 'text-warning' : 'text-danger';
  return (
    <div className="print-avoid-break space-y-2 rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-mono text-xs text-muted-foreground">{pl.report.vsTarget(target)}</p>
      </div>
      <p className="flex items-baseline gap-3">
        <span className="font-mono text-4xl font-medium tracking-tight">{level}</span>
        <span className={cn('text-sm font-medium', tone)}>{pl.report.cefrDelta(diff)}</span>
      </p>
      <p className="text-sm leading-relaxed text-foreground/80">{justification}</p>
    </div>
  );
}

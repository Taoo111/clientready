import { cefrRank, type CefrLevel, type TargetLevel } from '@clientready/shared';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** One CEFR estimate, coloured by how it compares with the target level. */
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
    <div className="print-avoid-break space-y-2 rounded-xl border bg-background/60 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{pl.report.vsTarget(target)}</p>
      </div>
      <p className={cn('font-mono text-4xl font-semibold tracking-tight', tone)}>{level}</p>
      <p className="text-sm leading-relaxed text-foreground/80">{justification}</p>
    </div>
  );
}

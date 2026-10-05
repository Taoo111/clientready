import type { AdminAssessmentDetail } from '@clientready/shared';
import { pl } from '@/i18n/pl';
import { formatClock } from '@/lib/format';
import { highlightQuotes } from '@/lib/report/highlight';
import { cn } from '@/lib/utils';

const t = pl.report;

/**
 * The conversation as chat bubbles. Evidence quotes are highlighted like a marker on paper,
 * and each turn has an anchor (`#turn-<seq>`) the quotes link to.
 */
export function Transcript({
  turns,
  quotes,
}: {
  turns: AdminAssessmentDetail['turns'];
  /** Evidence quotes by transcript turn (seq). */
  quotes: ReadonlyMap<number, readonly string[]>;
}) {
  if (turns.length === 0) return <p className="text-sm text-muted-foreground">{t.noTranscript}</p>;
  return (
    <ol className="space-y-3">
      {turns.map((turn) => {
        const ai = turn.speaker === 'AI';
        return (
          <li
            key={turn.seq}
            id={`turn-${turn.seq}`}
            className={cn('flex scroll-mt-24', ai ? 'justify-start' : 'justify-end')}
          >
            <div
              className={cn(
                'print-avoid-break max-w-[85%] rounded-lg px-4 py-2.5 sm:max-w-[75%]',
                ai ? 'border bg-card' : 'bg-brand-soft',
                'target:ring-2 target:ring-brand',
              )}
            >
              <p className="mb-0.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">
                  {ai ? t.speakerAi : t.speakerCandidate}
                </span>{' '}
                · <span className="font-mono tabular">{formatClock(turn.startedAtMs)}</span>
              </p>
              <p className="text-sm leading-relaxed">
                {highlightQuotes(turn.text, quotes.get(turn.seq) ?? []).map((segment, i) =>
                  segment.marked ? (
                    <mark key={i} className="rounded-[2px] bg-marker px-0.5 text-foreground">
                      {segment.text}
                    </mark>
                  ) : (
                    segment.text
                  ),
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

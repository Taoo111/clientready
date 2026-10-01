import type { AdminAssessmentDetail } from '@clientready/shared';
import { pl } from '@/i18n/pl';
import { formatClock } from '@/lib/format';
import { cn } from '@/lib/utils';

const t = pl.report;

/**
 * The conversation as chat bubbles. Turns quoted as evidence are highlighted, and each
 * turn has an anchor (`#turn-<seq>`) the evidence quotes link to.
 */
export function Transcript({
  turns,
  quoted,
}: {
  turns: AdminAssessmentDetail['turns'];
  quoted: Set<number>;
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
                'print-avoid-break max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[75%]',
                ai ? 'rounded-tl-sm bg-muted' : 'rounded-tr-sm bg-brand-soft',
                quoted.has(turn.seq) && 'ring-2 ring-brand/40',
                'target:ring-2 target:ring-brand',
              )}
            >
              <p className="mb-0.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">
                  {ai ? t.speakerAi : t.speakerCandidate}
                </span>{' '}
                · <span className="tabular">{formatClock(turn.startedAtMs)}</span>
              </p>
              <p className="text-sm leading-relaxed">{turn.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

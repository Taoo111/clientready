import type { PublicAssessmentView } from '@clientready/shared';
import { en } from '@/i18n/en';
import { cn } from '@/lib/utils';

type Phases = PublicAssessmentView['phases'];

function label(phase: Phases[number]): string {
  return en.phases[phase.id as keyof typeof en.phases] ?? phase.name;
}

/** Index of the part the conversation is in, by elapsed time (the client follows the same clock). */
export function currentPhaseIndex(phases: Phases, elapsedMs: number): number {
  let end = 0;
  for (const [index, phase] of phases.entries()) {
    end += phase.durationSec * 1000;
    if (elapsedMs < end) return index;
  }
  return Math.max(0, phases.length - 1);
}

/** Segmented bar: one segment per part, proportional to its length. */
export function PhaseProgress({ phases, elapsedMs }: { phases: Phases; elapsedMs: number }) {
  const current = currentPhaseIndex(phases, elapsedMs);
  let start = 0;
  return (
    <div className="w-full space-y-2">
      <div className="flex w-full gap-1" aria-hidden>
        {phases.map((phase) => {
          const durationMs = phase.durationSec * 1000;
          const fill = Math.min(1, Math.max(0, (elapsedMs - start) / durationMs));
          start += durationMs;
          return (
            <span
              key={phase.id}
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              style={{ flexGrow: phase.durationSec, flexBasis: 0 }}
            >
              <span
                className="block h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${fill * 100}%` }}
              />
            </span>
          );
        })}
      </div>
      <ol className="flex justify-between gap-2 text-xs" aria-label={en.live.progress}>
        {phases.map((phase, index) => (
          <li
            key={phase.id}
            aria-current={index === current ? 'step' : undefined}
            className={cn(
              'truncate',
              index === current ? 'font-medium text-foreground' : 'text-muted-foreground',
              // On narrow screens only the current part is named.
              index !== current && 'hidden sm:block',
            )}
          >
            {label(phase)}
          </li>
        ))}
      </ol>
    </div>
  );
}

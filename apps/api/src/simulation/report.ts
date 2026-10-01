import type { EvaluationResult } from '../evaluation/evaluate';
import { formatClock } from '../prompts/client/v2';
import { summarise, type AiTurnCheck } from './metrics';
import type { SimulatedTurn } from './simulate';

/** Markdown report of one simulated conversation (written to simulations/). */
export function report(
  meta: Record<string, string>,
  turns: SimulatedTurn[],
  checks: AiTurnCheck[],
  evaluation: EvaluationResult | undefined,
): string {
  const metrics = summarise(checks);
  const flagged = checks.filter((c) => c.flags.length);
  let aiIndex = 0;
  return [
    `# Simulation — ${meta.role} / ${meta.persona} / ${meta.prompt}`,
    '',
    Object.entries(meta)
      .map(([k, v]) => `- **${k}**: ${v}`)
      .join('\n'),
    '',
    '## Client turn checks',
    '',
    `- AI turns: ${metrics.aiTurns}, avg words: ${metrics.avgWords}, max words: ${metrics.maxWords}`,
    `- multi-question turns: ${Math.round(metrics.multiQuestionShare * 100)}%`,
    ...Object.entries(metrics.flagCounts).map(([flag, n]) => `- ${flag}: ${n}`),
    '',
    flagged.length
      ? flagged.map((c) => `- AI #${c.index} [${c.flags.join(', ')}]: ${c.text}`).join('\n')
      : '_No flagged turns._',
    '',
    ...(evaluation
      ? [
          '## Evaluation',
          '',
          `- ${evaluation.provider}/${evaluation.model}, ${evaluation.promptVersion}`,
          `- status: ${evaluation.report.status}, recommendation: ${evaluation.report.recommendation}`,
          `- CEFR: speaking ${evaluation.report.cefr?.speaking.level}, listening ${evaluation.report.cefr?.listening.level}`,
          `- scores: ${evaluation.report.criteria.map((c) => `${c.key}=${c.score}`).join(', ')}`,
          '',
          evaluation.report.summary,
          '',
        ]
      : []),
    '## Transcript',
    '',
    ...turns.map((t) => {
      const label = t.speaker === 'AI' ? `**Client #${aiIndex++}**` : '**Candidate**';
      return `${label} (${formatClock(t.startedAtMs)}): ${t.text}\n`;
    }),
  ].join('\n');
}

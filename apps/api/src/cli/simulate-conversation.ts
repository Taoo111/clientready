/**
 * Simulates a conversation between the AI client (realtime model, text mode, same prompt)
 * and a scripted candidate persona, checks the client's turns against the guardrails and
 * optionally evaluates the transcript. For prompt tuning; costs a few cents per run.
 *
 *   pnpm simulate --role business-analyst --persona medium [--level B2] [--prompt client-v2]
 *                 [--runs 2] [--evaluate]
 */
import { config as loadDotenv } from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { getRoleTemplate, listRoleTemplates, TargetLevelSchema } from '@clientready/shared';
import { validateEnv } from '../config/env';
import { evaluateConversation, type EvaluationResult } from '../evaluation/evaluate';
import { createEvaluationProvider } from '../evaluation/provider-factory';
import { clientPrompts, currentClientPrompt } from '../prompts/client';
import { formatClock } from '../prompts/client/v2';
import { checkAiTurn, summarise, type AiTurnCheck } from '../simulation/metrics';
import { PERSONAS, type PersonaId } from '../simulation/personas';
import { simulateConversation, type SimulatedTurn } from '../simulation/simulate';

loadDotenv({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });
const OUT_DIR = path.resolve(__dirname, '../../../../simulations');

function report(
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

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: {
      role: { type: 'string', default: 'backend-developer' },
      level: { type: 'string', default: 'B2' },
      persona: { type: 'string', default: 'medium' },
      prompt: { type: 'string', default: currentClientPrompt.CLIENT_PROMPT_VERSION },
      runs: { type: 'string', default: '1' },
      'candidate-model': { type: 'string', default: 'gpt-6-luna' },
      evaluate: { type: 'boolean', default: false },
    },
  });
  const template = getRoleTemplate(values.role);
  const prompt = clientPrompts[values.prompt];
  const level = TargetLevelSchema.safeParse(values.level);
  if (!template || !prompt || !level.success || !(values.persona in PERSONAS)) {
    console.error(
      `Roles: ${listRoleTemplates()
        .map((t) => t.id)
        .join(', ')}\n` +
        `Personas: ${Object.keys(PERSONAS).join(', ')}\nPrompts: ${Object.keys(clientPrompts).join(', ')}`,
    );
    process.exitCode = 1;
    return;
  }
  const env = validateEnv(process.env);
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  const persona = values.persona as PersonaId;
  await mkdir(OUT_DIR, { recursive: true });

  for (let run = 1; run <= Number(values.runs); run++) {
    console.log(`\n▶ ${template.id} / ${persona} / ${values.prompt} / ${level.data} — run ${run}`);
    const turns = await simulateConversation({
      apiKey: env.OPENAI_API_KEY,
      realtimeModel: env.OPENAI_REALTIME_MODEL,
      reasoningEffort: env.OPENAI_REALTIME_REASONING_EFFORT,
      candidateModel: values['candidate-model'],
      template,
      level: level.data,
      persona,
      prompt,
      onTurn: (t) => process.stdout.write(t.speaker === 'AI' ? 'C' : 'c'),
      onWarning: (message) =>
        console.warn(`
  ! ${message}`),
    });
    const checks = turns.filter((t) => t.speaker === 'AI').map((t, i) => checkAiTurn(t.text, i));
    const metrics = summarise(checks);

    let evaluation: EvaluationResult | undefined;
    if (values.evaluate) {
      const last = turns.at(-1);
      evaluation = await evaluateConversation(
        {
          template,
          targetLevel: level.data,
          turns: turns.map((t, seq) => ({ ...t, seq })),
          conversationMs: last ? last.startedAtMs + last.durationMs : 0,
          thresholds: {
            minConversationMs: env.EVAL_MIN_CONVERSATION_SEC * 1000,
            minCandidateSpeechMs: env.EVAL_MIN_CANDIDATE_SPEECH_SEC * 1000,
          },
        },
        createEvaluationProvider(env),
      );
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const file = path.join(
      OUT_DIR,
      `${stamp}-${template.id}-${persona}-${values.prompt}-${run}.md`,
    );
    const meta = {
      role: template.id,
      level: level.data,
      persona: `${persona} — ${PERSONAS[persona].description}`,
      prompt: values.prompt,
      model: `${env.OPENAI_REALTIME_MODEL} (text mode, reasoning ${env.OPENAI_REALTIME_REASONING_EFFORT})`,
      'simulated length': formatClock(
        (turns.at(-1)?.startedAtMs ?? 0) + (turns.at(-1)?.durationMs ?? 0),
      ),
    };
    await writeFile(file, report(meta, turns, checks, evaluation));
    console.log(
      `\n  AI turns ${metrics.aiTurns}, avg ${metrics.avgWords} words (max ${metrics.maxWords}), ` +
        `multi-question ${Math.round(metrics.multiQuestionShare * 100)}%, ` +
        Object.entries(metrics.flagCounts)
          .filter(([flag]) => flag !== 'multi-question')
          .map(([flag, n]) => `${flag} ${n}`)
          .join(', '),
    );
    if (evaluation) {
      console.log(
        `  evaluation: ${evaluation.report.status} ${evaluation.report.recommendation ?? ''} ` +
          `(speaking ${evaluation.report.cefr?.speaking.level ?? '-'}, listening ${evaluation.report.cefr?.listening.level ?? '-'})`,
      );
    }
    console.log(`  → ${path.relative(process.cwd(), file)}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

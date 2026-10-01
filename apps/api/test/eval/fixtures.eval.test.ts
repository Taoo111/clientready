/**
 * Calibration check against the real evaluation provider (costs a few cents per run).
 * Run with `pnpm test:eval`; skipped when the selected provider has no API key.
 */
import { cefrRank, getRoleTemplate, type CefrLevel, type RoleTemplate } from '@clientready/shared';
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { validateEnv } from '../../src/config/env';
import { evaluateConversation, type EvaluationResult } from '../../src/evaluation/evaluate';
import { createEvaluationProvider } from '../../src/evaluation/providers/provider-factory';
import { transcriptFixtures, type TranscriptFixture } from '../fixtures/transcripts';

loadDotenv({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });
const env = validateEnv(process.env);
const hasKey = env.EVAL_PROVIDER === 'openai' ? !!env.OPENAI_API_KEY : !!env.ANTHROPIC_API_KEY;
const results = new Map<string, EvaluationResult>();
const rejectedQuotes: string[] = [];

const average = (r: EvaluationResult) =>
  r.report.criteria.reduce((sum, c) => sum + c.score, 0) / r.report.criteria.length;
const score = (r: EvaluationResult, key: string) =>
  r.report.criteria.find((c) => c.key === key)?.score ?? 0;
const byRole = (templateId: string) =>
  transcriptFixtures.filter((f) => f.templateId === templateId);
const roles = [...new Set(transcriptFixtures.map((f) => f.templateId))];

describe.skipIf(!hasKey)(`evaluation fixtures (${env.EVAL_PROVIDER})`, () => {
  beforeAll(async () => {
    const provider = createEvaluationProvider(env);
    const evaluate = async (fixture: TranscriptFixture) => {
      const result = await evaluateConversation(
        {
          template: getRoleTemplate(fixture.templateId) as RoleTemplate,
          targetLevel: fixture.targetLevel,
          turns: fixture.turns,
          conversationMs: fixture.conversationMs,
          thresholds: { minConversationMs: 420_000, minCandidateSpeechMs: 180_000 },
        },
        provider,
        { warn: (message) => rejectedQuotes.push(`${fixture.name}: ${message}`) },
      );
      results.set(fixture.name, result);
    };
    await Promise.all(transcriptFixtures.map(evaluate));

    console.table(
      transcriptFixtures.map((f) => {
        const r = results.get(f.name)!;
        return {
          fixture: f.name,
          model: `${r.provider}/${r.model}`,
          prompt: r.promptVersion,
          status: r.report.status,
          recommendation: r.report.recommendation,
          modelRecommendation: r.report.modelRecommendation,
          speaking: r.report.cefr?.speaking.level,
          listening: r.report.cefr?.listening.level,
          scores: r.report.criteria.map((c) => c.score).join(' '),
          evidence: r.report.criteria.map((c) => c.evidence.length).join(' '),
        };
      }),
    );
    if (rejectedQuotes.length) console.warn(rejectedQuotes.join('\n'));
  });

  it.each(transcriptFixtures.map((f) => [f.name, f] as const))(
    '%s: expected recommendation and speaking level',
    (name, fixture) => {
      const result = results.get(name)!;
      expect(result.report.status).toBe('OK');
      expect(result.report.recommendation).toBe(fixture.expected.recommendation);
      const speaking = cefrRank(result.report.cefr!.speaking.level);
      const [min, max] = fixture.expected.speaking as [CefrLevel, CefrLevel];
      expect(speaking).toBeGreaterThanOrEqual(cefrRank(min));
      expect(speaking).toBeLessThanOrEqual(cefrRank(max));
    },
  );

  it.each(roles)('%s: orders candidates by average score (strong > medium > weak)', (role) => {
    const [strong, medium, weak] = byRole(role).map((f) => average(results.get(f.name)!));
    expect(strong).toBeGreaterThan(medium!);
    expect(medium).toBeGreaterThan(weak!);
  });

  it.each(roles)('%s: medium handles pressure worse than strong', (role) => {
    const [strong, medium] = byRole(role).map((f) => results.get(f.name)!);
    expect(score(medium!, 'handling_pressure')).toBeLessThan(score(strong!, 'handling_pressure'));
  });

  it('backs every criterion with at least one verified quote', () => {
    for (const result of results.values()) {
      for (const criterion of result.report.criteria) {
        expect(criterion.evidence.length, `${criterion.key}`).toBeGreaterThan(0);
      }
    }
  });

  it('notices the Polish sentences of the weak candidates', () => {
    for (const fixture of transcriptFixtures.filter((f) => f.name.endsWith('weak'))) {
      expect(results.get(fixture.name)!.report.language.nonEnglishDetected, fixture.name).toBe(
        true,
      );
    }
  });
});

import { getRoleTemplate, type AssessmentStatus, type RoleTemplate } from '@clientready/shared';
import request from 'supertest';
import { TEST_ADMIN_KEY } from '../test-env';
import type { TestContext } from '../test-app';

/** Shared steps for e2e tests that need a finished (and evaluated) conversation. */

const template = getRoleTemplate('backend-developer') as RoleTemplate;

const CANDIDATE_ANSWER =
  'We moved the payouts to a queue because the batch job was too slow and the client wanted faster settlements.';

/** A valid evaluation output for the fake provider (READY, B2). */
export function modelOutput() {
  return {
    languageUse: { nonEnglishUsed: false, notes: '' },
    sufficientEvidence: true,
    insufficientReason: '',
    criteria: template.rubric.map((c) => ({
      key: c.key,
      evidence: [
        { seq: 1, quote: 'we moved the payouts to a queue' },
        { seq: 1, quote: 'this sentence was never said' },
      ],
      comment: 'Konkretne odpowiedzi.',
      score: 4,
    })),
    cefr: {
      speaking: { level: 'B2', justification: 'Płynne wyjaśnienia.' },
      listening: { level: 'B2', justification: 'Rozumie pytania.' },
    },
    recommendation: 'READY',
    summary: 'Kandydat dobrze tłumaczy decyzje techniczne.',
  };
}

export async function createAssessment(ctx: TestContext): Promise<{ id: string; token: string }> {
  const res = await request(ctx.app.getHttpServer())
    .post('/admin/assessments')
    .set('x-admin-key', TEST_ADMIN_KEY)
    .send({ roleTemplateId: 'backend-developer', targetLevel: 'B2', candidateName: 'Anna' })
    .expect(201);
  return res.body;
}

/** Runs a conversation of `minutes` with 12 candidate turns of 20 s each (4 min of speech). */
export async function completedConversation(
  ctx: TestContext,
  minutes = 10,
): Promise<{ id: string; token: string }> {
  const http = () => request(ctx.app.getHttpServer());
  const assessment = await createAssessment(ctx);
  const { token } = assessment;
  await http().post(`/public/assessments/${token}/consent`).expect(200);
  await http().post(`/public/assessments/${token}/realtime-session`).expect(200);
  const turns = Array.from({ length: 12 }, (_, i) => [
    { seq: i * 2, speaker: 'AI', text: `Question ${i}?`, startedAtMs: i * 45_000 },
    {
      seq: i * 2 + 1,
      speaker: 'CANDIDATE',
      text: CANDIDATE_ANSWER,
      startedAtMs: i * 45_000 + 4_000,
      durationMs: 20_000,
    },
  ]).flat();
  await http().post(`/public/assessments/${token}/turns`).send({ turns }).expect(200);
  ctx.clock.advance(minutes * 60_000);
  await http().post(`/public/assessments/${token}/end`).expect(200);
  return assessment;
}

export async function waitForStatus(
  ctx: TestContext,
  id: string,
  status: AssessmentStatus,
): Promise<void> {
  for (let i = 0; i < 100; i++) {
    const row = await ctx.prisma.assessment.findUniqueOrThrow({ where: { id } });
    if (row.status === status) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const row = await ctx.prisma.assessment.findUniqueOrThrow({ where: { id } });
  throw new Error(`Expected status ${status}, got ${row.status} (${row.evaluationError})`);
}

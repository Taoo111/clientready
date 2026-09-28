import { getRoleTemplate, type AssessmentStatus, type RoleTemplate } from '@clientready/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EvaluationProviderError } from '../src/evaluation/provider';
import { TEST_ADMIN_KEY } from './test-env';
import { createTestApp, resetDatabase, type TestContext } from './test-app';

let ctx: TestContext;
const http = () => request(ctx.app.getHttpServer());
const template = getRoleTemplate('backend-developer') as RoleTemplate;

const CANDIDATE_ANSWER =
  'We moved the payouts to a queue because the batch job was too slow and the client wanted faster settlements.';

function modelOutput() {
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

async function createAssessment(): Promise<{ id: string; token: string }> {
  const res = await http()
    .post('/admin/assessments')
    .set('x-admin-key', TEST_ADMIN_KEY)
    .send({ roleTemplateId: 'backend-developer', targetLevel: 'B2', candidateName: 'Anna' })
    .expect(201);
  return res.body;
}

/** Runs a conversation of `minutes` with 12 candidate turns of 20 s each (4 min of speech). */
async function completedConversation(minutes = 10): Promise<{ id: string; token: string }> {
  const assessment = await createAssessment();
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

async function waitForStatus(id: string, status: AssessmentStatus): Promise<void> {
  for (let i = 0; i < 100; i++) {
    const row = await ctx.prisma.assessment.findUniqueOrThrow({ where: { id } });
    if (row.status === status) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const row = await ctx.prisma.assessment.findUniqueOrThrow({ where: { id } });
  throw new Error(`Expected status ${status}, got ${row.status} (${row.evaluationError})`);
}

const detail = (id: string) =>
  http().get(`/admin/assessments/${id}`).set('x-admin-key', TEST_ADMIN_KEY);

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.app.close();
});

beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.clock.reset();
  ctx.evaluation.reset();
  ctx.evaluation.output = modelOutput();
});

describe('automatic evaluation', () => {
  it('evaluates after the session ends and exposes the report to the admin', async () => {
    const { id } = await completedConversation();
    await waitForStatus(id, 'EVALUATED');

    const res = await detail(id).expect(200);
    expect(res.body.report).toMatchObject({
      provider: 'openai',
      model: 'fake-eval',
      promptVersion: 'evaluation-v1',
      data: {
        status: 'OK',
        targetLevel: 'B2',
        recommendation: 'READY',
        cefr: { speaking: { level: 'B2' } },
        stats: { candidateTurns: 12, candidateSpeechMs: 240_000 },
      },
    });
    const [criterion] = res.body.report.data.criteria;
    // The invented quote was rejected; the real one kept with its turn.
    expect(criterion).toMatchObject({
      evidence: [{ quote: 'we moved the payouts to a queue', seq: 1 }],
      rejectedQuotes: 1,
    });
    expect(res.body.turns).toHaveLength(24);
    expect(res.body.status).toBe('EVALUATED');
    expect(ctx.evaluation.calls).toBe(1);
  });

  it('marks a too short conversation as insufficient data without calling the model', async () => {
    const { id } = await completedConversation(3);
    await waitForStatus(id, 'EVALUATED');
    const res = await detail(id).expect(200);
    expect(res.body.report).toMatchObject({
      provider: 'rules',
      data: { status: 'INSUFFICIENT_DATA', recommendation: null, criteria: [] },
    });
    expect(ctx.evaluation.calls).toBe(0);
  });

  it('retries transient provider errors', async () => {
    ctx.evaluation.failures = [
      new EvaluationProviderError('rate limited', true),
      new EvaluationProviderError('server error', true),
    ];
    const { id } = await completedConversation();
    await waitForStatus(id, 'EVALUATED');
    const row = await ctx.prisma.assessment.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ evaluationAttempts: 3, evaluationError: null });
  });

  it('fails after the maximum number of attempts', async () => {
    ctx.evaluation.failures = Array.from(
      { length: 3 },
      () => new EvaluationProviderError('server error', true),
    );
    const { id } = await completedConversation();
    await waitForStatus(id, 'FAILED');
    const res = await detail(id).expect(200);
    expect(res.body).toMatchObject({
      status: 'FAILED',
      evaluationError: 'server error',
      report: null,
    });
    expect(ctx.evaluation.calls).toBe(3);
  });

  it('does not retry non-retryable errors', async () => {
    ctx.evaluation.failures = [new EvaluationProviderError('invalid api key', false)];
    const { id } = await completedConversation();
    await waitForStatus(id, 'FAILED');
    expect(ctx.evaluation.calls).toBe(1);
  });

  it('still accepts the recording upload after the evaluation finished', async () => {
    const { id, token } = await completedConversation();
    await waitForStatus(id, 'EVALUATED');
    const upload = await http()
      .post(`/public/assessments/${token}/recording`)
      .field('durationMs', '600000')
      .attach('file', Buffer.from('webm-bytes'), {
        filename: 'recording.webm',
        contentType: 'audio/webm',
      })
      .expect(201);

    const res = await detail(id).expect(200);
    expect(res.body.recordings).toHaveLength(1);
    const audio = await http()
      .get(`/admin/assessments/${id}/recordings/${upload.body.id}`)
      .set('x-admin-key', TEST_ADMIN_KEY)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(audio.headers['content-type']).toMatch(/^audio\/webm/);
    expect((audio.body as Buffer).toString()).toBe('webm-bytes');
  });
});

describe('POST /admin/assessments/:id/evaluate', () => {
  it('requires the admin key', async () => {
    await http().post('/admin/assessments/x/evaluate').expect(401);
    await http().get('/admin/assessments/x').expect(401);
  });

  it('re-runs the evaluation and keeps previous reports', async () => {
    const { id } = await completedConversation();
    await waitForStatus(id, 'EVALUATED');

    const output = modelOutput();
    output.cefr.speaking.level = 'B1';
    ctx.evaluation.output = output;
    const res = await http()
      .post(`/admin/assessments/${id}/evaluate`)
      .set('x-admin-key', TEST_ADMIN_KEY)
      .expect(200);
    expect(res.body.report.data).toMatchObject({
      recommendation: 'READY_WITH_CONCERNS',
      modelRecommendation: 'READY',
    });
    expect(await ctx.prisma.report.count({ where: { assessmentId: id } })).toBe(2);
  });

  it('returns 502 when the provider fails and leaves the status unchanged', async () => {
    const { id } = await completedConversation();
    await waitForStatus(id, 'EVALUATED');
    ctx.evaluation.failures = [new EvaluationProviderError('invalid api key', false)];
    await http()
      .post(`/admin/assessments/${id}/evaluate`)
      .set('x-admin-key', TEST_ADMIN_KEY)
      .expect(502);
    const row = await ctx.prisma.assessment.findUniqueOrThrow({ where: { id } });
    expect(row.status).toBe('EVALUATED');
  });

  it('rejects unfinished and unknown assessments', async () => {
    const { id } = await createAssessment();
    await http()
      .post(`/admin/assessments/${id}/evaluate`)
      .set('x-admin-key', TEST_ADMIN_KEY)
      .expect(409);
    await http()
      .post('/admin/assessments/unknown/evaluate')
      .set('x-admin-key', TEST_ADMIN_KEY)
      .expect(404);
  });
});

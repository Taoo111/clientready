import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  completedConversation,
  createAssessment,
  modelOutput,
  waitForStatus,
} from './helpers/conversation';
import { TEST_ADMIN_KEY } from './test-env';
import { createTestApp, resetDatabase, type TestContext } from './test-app';

let ctx: TestContext;
const http = () => request(ctx.app.getHttpServer());

async function evaluatedAssessment(): Promise<string> {
  const { id } = await completedConversation(ctx);
  await waitForStatus(ctx, id, 'EVALUATED');
  return id;
}

const decide = (id: string, body: object) =>
  http().post(`/admin/assessments/${id}/decision`).set('x-admin-key', TEST_ADMIN_KEY).send(body);

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

describe('recruiter decision', () => {
  it('records agreement with the AI recommendation', async () => {
    const id = await evaluatedAssessment();
    const res = await decide(id, { verdict: 'READY' }).expect(200);
    expect(res.body.decision).toMatchObject({
      verdict: 'READY',
      agreesWithAi: true,
      comment: null,
      decidedBy: 'admin key',
      forCurrentReport: true,
    });
  });

  it('requires a comment to disagree, and keeps every change as history', async () => {
    const id = await evaluatedAssessment();
    await decide(id, { verdict: 'NOT_READY' }).expect(400);
    await decide(id, { verdict: 'READY' }).expect(200);
    const res = await decide(id, {
      verdict: 'NOT_READY',
      comment: 'Could not explain the incident handling in English.',
    }).expect(200);

    expect(res.body.decision).toMatchObject({ verdict: 'NOT_READY', agreesWithAi: false });
    const list = await http()
      .get('/admin/assessments')
      .set('x-admin-key', TEST_ADMIN_KEY)
      .expect(200);
    expect(list.body.items[0].decision).toEqual({ verdict: 'NOT_READY', agreesWithAi: false });
    expect(await ctx.prisma.recruiterDecision.count({ where: { assessmentId: id } })).toBe(2);
  });

  it('marks the decision as outdated after the evaluation is re-run', async () => {
    const id = await evaluatedAssessment();
    await decide(id, { verdict: 'READY' }).expect(200);
    await http()
      .post(`/admin/assessments/${id}/evaluate`)
      .set('x-admin-key', TEST_ADMIN_KEY)
      .expect(200);
    const res = await http()
      .get(`/admin/assessments/${id}`)
      .set('x-admin-key', TEST_ADMIN_KEY)
      .expect(200);
    expect(res.body.decision.forCurrentReport).toBe(false);
    const list = await http()
      .get('/admin/assessments')
      .set('x-admin-key', TEST_ADMIN_KEY)
      .expect(200);
    // An outdated decision means the new report still needs a review.
    expect(list.body.items[0].decision).toBeNull();
  });

  it('is rejected without a report, and removed with the candidate data', async () => {
    const { id: pending } = await createAssessment(ctx);
    await decide(pending, { verdict: 'READY' }).expect(409);

    const id = await evaluatedAssessment();
    await decide(id, { verdict: 'READY' }).expect(200);
    await http()
      .delete(`/admin/assessments/${id}/data`)
      .set('x-admin-key', TEST_ADMIN_KEY)
      .expect(200);
    expect(await ctx.prisma.recruiterDecision.count()).toBe(0);
    await decide(id, { verdict: 'READY' }).expect(409);
  });

  it('requires recruiter authentication', async () => {
    const id = await evaluatedAssessment();
    await http().post(`/admin/assessments/${id}/decision`).send({ verdict: 'READY' }).expect(401);
  });
});

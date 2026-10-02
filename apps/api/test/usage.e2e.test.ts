import { EMPTY_USAGE } from '@clientready/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as helpers from './helpers/conversation';
import { createTestApp, resetDatabase, type TestContext } from './test-app';

let ctx: TestContext;
const http = () => request(ctx.app.getHttpServer());

const CONNECTION = 'c0ffee00-1111-4222-8333-444455556666';
const realtime = {
  ...EMPTY_USAGE,
  inputAudioTokens: 300,
  cachedTextTokens: 9000,
  outputAudioTokens: 800,
};
const transcription = { ...EMPTY_USAGE, inputAudioTokens: 300, outputTextTokens: 40 };

const sendUsage = (token: string, body: object) =>
  http().post(`/public/assessments/${token}/usage`).send(body);

async function startedConversation(): Promise<{ id: string; token: string }> {
  const assessment = await helpers.createAssessment(ctx);
  await http().post(`/public/assessments/${assessment.token}/consent`).expect(200);
  await http().post(`/public/assessments/${assessment.token}/realtime-session`).expect(200);
  return assessment;
}

const usageRows = (assessmentId: string) =>
  ctx.prisma.usageRecord.findMany({ where: { assessmentId }, orderBy: { source: 'asc' } });

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
  ctx.evaluation.output = helpers.modelOutput();
});

describe('conversation usage', () => {
  it('stores realtime and transcription totals per connection with their models', async () => {
    const { id, token } = await startedConversation();
    await sendUsage(token, { connectionId: CONNECTION, realtime, transcription }).expect(204);

    const rows = await usageRows(id);
    expect(rows.map((r) => [r.source, r.model, r.ref])).toEqual([
      ['REALTIME', 'fake-realtime', CONNECTION],
      ['TRANSCRIPTION', 'gpt-4o-mini-transcribe', CONNECTION],
    ]);
    expect(rows[0]).toMatchObject(realtime);
  });

  it('replaces the totals when the same connection reports again', async () => {
    const { id, token } = await startedConversation();
    await sendUsage(token, { connectionId: CONNECTION, realtime, transcription }).expect(204);
    const later = { ...realtime, outputAudioTokens: 2000 };
    await sendUsage(token, { connectionId: CONNECTION, realtime: later, transcription }).expect(
      204,
    );

    const rows = await usageRows(id);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.outputAudioTokens).toBe(2000);
  });

  it('keeps separate rows for a resumed connection', async () => {
    const { id, token } = await startedConversation();
    await sendUsage(token, { connectionId: CONNECTION, realtime, transcription }).expect(204);
    await sendUsage(token, {
      connectionId: 'second-connection-id',
      realtime,
      transcription,
    }).expect(204);
    expect(await usageRows(id)).toHaveLength(4);
  });

  it('rejects malformed usage and conversations that have not started', async () => {
    const { token } = await startedConversation();
    await sendUsage(token, { connectionId: 'x', realtime, transcription }).expect(400);
    await sendUsage(token, {
      connectionId: CONNECTION,
      realtime: { ...realtime, outputAudioTokens: -1 },
      transcription,
    }).expect(400);

    const fresh = await helpers.createAssessment(ctx);
    await sendUsage(fresh.token, { connectionId: CONNECTION, realtime, transcription }).expect(409);
  });
});

describe('evaluation usage', () => {
  it('stores the tokens of each evaluation with its report', async () => {
    const { id } = await helpers.completedConversation(ctx);
    await helpers.waitForStatus(ctx, id, 'EVALUATED');

    const report = await ctx.prisma.report.findFirstOrThrow({ where: { assessmentId: id } });
    const rows = await usageRows(id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source: 'EVALUATION',
      model: 'fake-eval',
      ref: report.id,
      inputTextTokens: 6000,
      cachedTextTokens: 1000,
      outputTextTokens: 3000,
    });
  });
});

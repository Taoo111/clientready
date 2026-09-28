import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Storage } from '../src/storage/storage';
import { TEST_ADMIN_KEY } from './test-env';
import { createTestApp, resetDatabase, type TestContext } from './test-app';

let ctx: TestContext;
const http = () => request(ctx.app.getHttpServer());

async function startedAssessment(): Promise<string> {
  const res = await http()
    .post('/admin/assessments')
    .set('x-admin-key', TEST_ADMIN_KEY)
    .send({ roleTemplateId: 'backend-developer', targetLevel: 'B2', candidateName: 'Anna' })
    .expect(201);
  const token = res.body.token as string;
  await http().post(`/public/assessments/${token}/consent`).expect(200);
  await http().post(`/public/assessments/${token}/realtime-session`).expect(200);
  return token;
}

function upload(token: string, data: Buffer, contentType = 'audio/webm;codecs=opus') {
  return http()
    .post(`/public/assessments/${token}/recording`)
    .field('durationMs', '61000')
    .attach('file', data, { filename: 'recording.webm', contentType });
}

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.app.close();
});

beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.clock.reset();
});

describe('POST /public/assessments/:token/recording', () => {
  it('stores the recording and creates a Recording row', async () => {
    const token = await startedAssessment();
    const res = await upload(token, Buffer.from('fake-webm-audio')).expect(201);

    const row = await ctx.prisma.recording.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(row.mimeType).toMatch(/^audio\/webm/);
    expect(row.durationMs).toBe(61_000);
    expect(row.storageKey).toMatch(/^recordings\/[a-z0-9]+\/[0-9a-f-]{36}\.webm$/);
    const stored = await ctx.app.get(Storage).get(row.storageKey);
    expect(stored.toString()).toBe('fake-webm-audio');
  });

  it('accepts a late upload shortly after the end', async () => {
    const token = await startedAssessment();
    await http().post(`/public/assessments/${token}/end`).expect(200);
    await upload(token, Buffer.from('audio')).expect(201);
  });

  it('rejects non-audio files', async () => {
    const token = await startedAssessment();
    await upload(token, Buffer.from('<html>'), 'text/html').expect(400);
  });

  it('rejects files over the size limit', async () => {
    const token = await startedAssessment();
    await upload(token, Buffer.alloc(1024 * 1024 + 1)).expect(413);
  });

  it('rejects uploads long after the conversation ended', async () => {
    const token = await startedAssessment();
    await http().post(`/public/assessments/${token}/end`).expect(200);
    ctx.clock.advance(10 * 60_000);
    const res = await upload(token, Buffer.from('audio')).expect(409);
    expect(res.body.code).toBe('ALREADY_COMPLETED');
  });

  it('requires a file', async () => {
    const token = await startedAssessment();
    await http()
      .post(`/public/assessments/${token}/recording`)
      .field('durationMs', '1')
      .expect(400);
  });
});

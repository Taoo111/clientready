import { SESSION_HARD_LIMIT_MS } from '@clientready/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TEST_ADMIN_KEY } from './test-env';
import { createTestApp, resetDatabase, type TestContext } from './test-app';

let ctx: TestContext;

const http = () => request(ctx.app.getHttpServer());

async function createAssessment(overrides: Record<string, unknown> = {}): Promise<string> {
  const res = await http()
    .post('/admin/assessments')
    .set('x-admin-key', TEST_ADMIN_KEY)
    .send({
      roleTemplateId: 'backend-developer',
      targetLevel: 'B2',
      candidateName: 'Anna Nowak',
      candidateEmail: 'anna@example.com',
      ...overrides,
    })
    .expect(201);
  return res.body.token as string;
}

async function startSession(token: string) {
  await http().post(`/public/assessments/${token}/consent`).expect(200);
  return http().post(`/public/assessments/${token}/realtime-session`).expect(200);
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
  ctx.realtime.requests.length = 0;
  ctx.realtime.fail = false;
});

describe('POST /admin/assessments', () => {
  it('requires the admin key', async () => {
    await http().post('/admin/assessments').send({}).expect(401);
    await http().post('/admin/assessments').set('x-admin-key', 'wrong').send({}).expect(401);
  });

  it('validates input', async () => {
    const res = await http()
      .post('/admin/assessments')
      .set('x-admin-key', TEST_ADMIN_KEY)
      .send({ roleTemplateId: 'backend-developer', targetLevel: 'A1', candidateName: '' })
      .expect(400);
    expect(res.body.issues.map((i: { path: string }) => i.path)).toEqual(
      expect.arrayContaining(['targetLevel', 'candidateName']),
    );
  });

  it('rejects unknown role templates', async () => {
    await http()
      .post('/admin/assessments')
      .set('x-admin-key', TEST_ADMIN_KEY)
      .send({ roleTemplateId: 'astronaut', targetLevel: 'B2', candidateName: 'X' })
      .expect(400);
  });

  it('creates an assessment and returns the candidate link', async () => {
    const res = await http()
      .post('/admin/assessments')
      .set('x-admin-key', TEST_ADMIN_KEY)
      .send({ roleTemplateId: 'backend-developer', targetLevel: 'C1', candidateName: 'Jan' })
      .expect(201);
    expect(res.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(res.body.link).toBe(`http://localhost:3000/a/${res.body.token}`);
    const row = await ctx.prisma.assessment.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(row).toMatchObject({ status: 'CREATED', targetLevel: 'C1', candidateName: 'Jan' });
  });
});

describe('GET /public/assessments/:token', () => {
  it('returns a view without sensitive fields', async () => {
    const token = await createAssessment();
    const res = await http().get(`/public/assessments/${token}`).expect(200);
    expect(res.body).toEqual({
      status: 'CREATED',
      candidateName: 'Anna Nowak',
      roleName: 'Backend Developer',
      consentGiven: false,
      durationLimitMs: SESSION_HARD_LIMIT_MS,
      elapsedMs: 0,
      canStart: true,
      canResume: false,
      client: {
        name: 'Emma Visser',
        title: 'Product Owner',
        company: 'Northbeam Payments',
        location: 'Amsterdam',
      },
      phases: [
        { id: 'warm-up', name: 'Warm-up', durationSec: 120 },
        { id: 'project-deep-dive', name: 'Project deep-dive', durationSec: 270 },
        { id: 'client-situation', name: 'Client situation', durationSec: 240 },
        { id: 'closing', name: 'Closing', durationSec: 30 },
      ],
    });
  });

  it('returns 404 for unknown or malformed tokens', async () => {
    const res = await http()
      .get(`/public/assessments/${'x'.repeat(43)}`)
      .expect(404);
    expect(res.body.code).toBe('NOT_FOUND');
    await http().get('/public/assessments/short').expect(404);
  });

  it('returns 410 for an unused link past its TTL', async () => {
    const token = await createAssessment();
    ctx.clock.advance(15 * 24 * 60 * 60_000);
    const res = await http().get(`/public/assessments/${token}`).expect(410);
    expect(res.body.code).toBe('LINK_EXPIRED');
  });
});

describe('conversation lifecycle', () => {
  it('requires consent before starting', async () => {
    const token = await createAssessment();
    const res = await http().post(`/public/assessments/${token}/realtime-session`).expect(409);
    expect(res.body.code).toBe('CONSENT_REQUIRED');
    expect(ctx.realtime.requests).toHaveLength(0);
  });

  it('records consent idempotently', async () => {
    const token = await createAssessment();
    await http().post(`/public/assessments/${token}/consent`).expect(200);
    const first = await ctx.prisma.assessment.findUniqueOrThrow({ where: { token } });
    ctx.clock.advance(5_000);
    const res = await http().post(`/public/assessments/${token}/consent`).expect(200);
    expect(res.body.consentGiven).toBe(true);
    const second = await ctx.prisma.assessment.findUniqueOrThrow({ where: { token } });
    expect(second.consentAt).toEqual(first.consentAt);
  });

  it('starts a realtime session with server-built instructions', async () => {
    const token = await createAssessment();
    const res = await startSession(token);
    expect(res.body).toMatchObject({
      clientSecret: 'ek_test_1',
      model: 'fake-realtime',
      isResume: false,
      elapsedMs: 0,
      remainingMs: SESSION_HARD_LIMIT_MS,
      nextSeq: 0,
    });
    expect(res.body.timeCues.length).toBeGreaterThan(0);
    expect(res.body.paceNotes.slower).toMatch(/slower pace/);
    expect(res.body).not.toHaveProperty('instructions');

    const [req] = ctx.realtime.requests;
    expect(req?.instructions).toContain('Northbeam Payments');
    expect(req?.instructions).toContain('Anna');
    expect(req?.instructions).not.toContain('Nowak');
    expect(req?.tools.map((t) => t.name)).toEqual(['set_speaking_pace']);
    expect(req?.safetyIdentifier).toMatch(/^[a-f0-9]{64}$/);

    const row = await ctx.prisma.assessment.findUniqueOrThrow({ where: { token } });
    expect(row).toMatchObject({
      status: 'IN_PROGRESS',
      realtimeModel: 'fake-realtime',
      promptVersion: 'client-v4',
      connectCount: 1,
    });
    expect(row.startedAt).not.toBeNull();
  });

  it('does not start when the realtime provider fails', async () => {
    const token = await createAssessment();
    ctx.realtime.fail = true;
    await http().post(`/public/assessments/${token}/consent`).expect(200);
    const res = await http().post(`/public/assessments/${token}/realtime-session`).expect(503);
    expect(res.body.code).toBe('REALTIME_UNAVAILABLE');
    const row = await ctx.prisma.assessment.findUniqueOrThrow({ where: { token } });
    expect(row.status).toBe('CREATED');
  });

  it('persists transcript turns idempotently', async () => {
    const token = await createAssessment();
    await startSession(token);
    const turns = [
      { seq: 0, speaker: 'AI', text: 'Hi Anna!', startedAtMs: 500 },
      { seq: 1, speaker: 'CANDIDATE', text: 'Hello Emma.', startedAtMs: 3_000 },
    ];
    await http().post(`/public/assessments/${token}/turns`).send({ turns }).expect(200);
    await http().post(`/public/assessments/${token}/turns`).send({ turns }).expect(200);
    const rows = await ctx.prisma.transcriptTurn.findMany({ orderBy: { seq: 'asc' } });
    expect(rows.map((r) => [r.seq, r.speaker, r.text])).toEqual([
      [0, 'AI', 'Hi Anna!'],
      [1, 'CANDIDATE', 'Hello Emma.'],
    ]);
  });

  it('validates transcript turns', async () => {
    const token = await createAssessment();
    await startSession(token);
    await http()
      .post(`/public/assessments/${token}/turns`)
      .send({ turns: [{ seq: -1, speaker: 'BOT', text: '', startedAtMs: 0 }] })
      .expect(400);
  });

  it('rejects turns before the conversation started', async () => {
    const token = await createAssessment();
    await http()
      .post(`/public/assessments/${token}/turns`)
      .send({ turns: [{ seq: 0, speaker: 'AI', text: 'Hi', startedAtMs: 0 }] })
      .expect(409);
  });

  it('resumes with the transcript so far', async () => {
    const token = await createAssessment();
    await startSession(token);
    await http()
      .post(`/public/assessments/${token}/turns`)
      .send({
        turns: [
          { seq: 0, speaker: 'AI', text: 'Tell me about your last project.', startedAtMs: 500 },
          {
            seq: 1,
            speaker: 'CANDIDATE',
            text: 'A payments ledger in Kotlin.',
            startedAtMs: 4_000,
          },
        ],
      })
      .expect(200);
    ctx.clock.advance(200_000);

    const view = await http().get(`/public/assessments/${token}`).expect(200);
    expect(view.body).toMatchObject({ status: 'IN_PROGRESS', canResume: true, canStart: false });

    const res = await http().post(`/public/assessments/${token}/realtime-session`).expect(200);
    expect(res.body).toMatchObject({ isResume: true, nextSeq: 2 });
    expect(res.body.elapsedMs).toBeGreaterThanOrEqual(200_000);
    expect(res.body.remainingMs).toBe(SESSION_HARD_LIMIT_MS - res.body.elapsedMs);
    expect(res.body.timeCues.every((c: { atMs: number }) => c.atMs > 200_000)).toBe(true);
    const resumePrompt = ctx.realtime.requests[1]?.instructions;
    expect(resumePrompt).toContain('Reconnected call');
    expect(resumePrompt).toContain('Candidate: A payments ledger in Kotlin.');
  });

  it('caps the number of connections', async () => {
    const token = await createAssessment();
    await startSession(token); // 1
    await http().post(`/public/assessments/${token}/realtime-session`).expect(200); // 2
    await http().post(`/public/assessments/${token}/realtime-session`).expect(200); // 3
    const res = await http().post(`/public/assessments/${token}/realtime-session`).expect(429);
    expect(res.body.code).toBe('TOO_MANY_CONNECTIONS');
  });

  it('refuses to resume when almost no time is left and completes the assessment', async () => {
    const token = await createAssessment();
    await startSession(token);
    ctx.clock.advance(SESSION_HARD_LIMIT_MS - 10_000);
    const res = await http().post(`/public/assessments/${token}/realtime-session`).expect(409);
    expect(res.body.code).toBe('TIME_UP');
    const row = await ctx.prisma.assessment.findUniqueOrThrow({ where: { token } });
    expect(row.status).toBe('COMPLETED');
  });

  it('ends the conversation and cannot be started again', async () => {
    const token = await createAssessment();
    await startSession(token);
    ctx.clock.advance(60_000);
    const end = await http().post(`/public/assessments/${token}/end`).expect(200);
    expect(end.body).toMatchObject({ status: 'COMPLETED', canResume: false, canStart: false });
    await http().post(`/public/assessments/${token}/end`).expect(200);

    const again = await http().post(`/public/assessments/${token}/realtime-session`).expect(409);
    expect(again.body.code).toBe('ALREADY_COMPLETED');
    await http().post(`/public/assessments/${token}/consent`).expect(409);

    // Late transcript flushes are still accepted shortly after the end...
    await http()
      .post(`/public/assessments/${token}/turns`)
      .send({ turns: [{ seq: 0, speaker: 'AI', text: 'Bye!', startedAtMs: 59_000 }] })
      .expect(200);
    // ...but not later.
    ctx.clock.advance(10 * 60_000);
    await http()
      .post(`/public/assessments/${token}/turns`)
      .send({ turns: [{ seq: 1, speaker: 'AI', text: 'Late', startedAtMs: 60_000 }] })
      .expect(409);
  });

  it('auto-completes an abandoned conversation', async () => {
    const token = await createAssessment();
    await startSession(token);
    ctx.clock.advance(SESSION_HARD_LIMIT_MS + 6 * 60_000);
    const res = await http().get(`/public/assessments/${token}`).expect(200);
    expect(res.body).toMatchObject({ status: 'COMPLETED', elapsedMs: SESSION_HARD_LIMIT_MS });
  });

  it('does not expire links of started assessments', async () => {
    const token = await createAssessment();
    await startSession(token);
    await http().post(`/public/assessments/${token}/end`).expect(200);
    ctx.clock.advance(30 * 24 * 60 * 60_000);
    const res = await http().get(`/public/assessments/${token}`).expect(200);
    expect(res.body.status).toBe('COMPLETED');
  });
});

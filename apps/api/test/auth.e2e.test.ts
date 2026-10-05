import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Storage } from '../src/infra/storage/storage';
import { TEST_ADMIN_KEY } from './test-env';
import { createTestApp, resetDatabase, type TestContext } from './test-app';

let ctx: TestContext;
const http = () => request(ctx.app.getHttpServer());

const EMAIL = 'recruiter@example.com';
const PASSWORD = 'correct horse battery staple';

async function login(email = EMAIL, password = PASSWORD) {
  return http().post('/auth/login').send({ email, password });
}

async function token(): Promise<string> {
  const res = await login();
  expect(res.status).toBe(200);
  return res.body.token as string;
}

async function createAssessment(auth: string, name = 'Anna Nowak') {
  const res = await http()
    .post('/admin/assessments')
    .set('Authorization', `Bearer ${auth}`)
    .send({ roleTemplateId: 'backend-developer', targetLevel: 'B2', candidateName: name })
    .expect(201);
  return res.body as { id: string; token: string; link: string };
}

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.app.close();
});

beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  await ctx.prisma.recruiterSession.deleteMany();
  ctx.clock.reset();
});

describe('POST /auth/login', () => {
  it('seeds the admin recruiter with an argon2 hash', async () => {
    const recruiter = await ctx.prisma.recruiter.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(recruiter.passwordHash).toMatch(/^\$argon2id\$/);
    expect(recruiter.passwordHash).not.toContain(PASSWORD);
  });

  it('returns a session token for valid credentials (email case-insensitive)', async () => {
    const res = await login('Recruiter@Example.com');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ recruiter: { email: EMAIL } });
    expect(res.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // Only a hash of the token is stored.
    const session = await ctx.prisma.recruiterSession.findFirstOrThrow();
    expect(session.tokenHash).not.toBe(res.body.token);
  });

  it('rejects a wrong password and an unknown email with the same response', async () => {
    const wrong = await login(EMAIL, 'wrong password!!');
    const unknown = await login('nobody@example.com', PASSWORD);
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
    expect(await ctx.prisma.recruiterSession.count()).toBe(0);
  });

  it('validates input', async () => {
    await http().post('/auth/login').send({ email: 'not-an-email', password: '' }).expect(400);
  });
});

describe('session protection of /admin endpoints', () => {
  it('rejects requests without credentials', async () => {
    await http().get('/admin/assessments').expect(401);
    await http().get('/auth/me').expect(401);
    await http().post('/admin/assessments').send({}).expect(401);
    await http().delete('/admin/assessments/x/data').expect(401);
  });

  it('rejects an invalid session token even if an admin key is also sent', async () => {
    await http()
      .get('/admin/assessments')
      .set('Authorization', 'Bearer not-a-real-token')
      .set('x-admin-key', TEST_ADMIN_KEY)
      .expect(401);
  });

  it('accepts a valid session and identifies the recruiter', async () => {
    const auth = await token();
    const me = await http().get('/auth/me').set('Authorization', `Bearer ${auth}`).expect(200);
    expect(me.body.email).toBe(EMAIL);
    await http().get('/admin/assessments').set('Authorization', `Bearer ${auth}`).expect(200);
  });

  it('still accepts ADMIN_API_KEY for scripts', async () => {
    await http().get('/admin/assessments').set('x-admin-key', TEST_ADMIN_KEY).expect(200);
    await http().get('/admin/assessments').set('x-admin-key', 'wrong').expect(401);
  });

  it('expires sessions after SESSION_TTL_HOURS', async () => {
    const auth = await token();
    ctx.clock.advance(13 * 3_600_000);
    await http().get('/admin/assessments').set('Authorization', `Bearer ${auth}`).expect(401);
  });

  it('logout invalidates the session', async () => {
    const auth = await token();
    await http().post('/auth/logout').set('Authorization', `Bearer ${auth}`).expect(204);
    await http().get('/admin/assessments').set('Authorization', `Bearer ${auth}`).expect(401);
  });
});

describe('GET /admin/assessments', () => {
  it('lists newest first with search and filters', async () => {
    const auth = await token();
    await createAssessment(auth, 'Anna Nowak');
    ctx.clock.advance(1_000);
    const second = await createAssessment(auth, 'Jan Kowalski');
    await http().post(`/public/assessments/${second.token}/consent`).expect(200);
    await http().post(`/public/assessments/${second.token}/realtime-session`).expect(200);

    const list = (query: Record<string, string> = {}) =>
      http().get('/admin/assessments').query(query).set('Authorization', `Bearer ${auth}`);

    const all = await list().expect(200);
    expect(all.body.total).toBe(2);
    expect(all.body.items.map((i: { candidateName: string }) => i.candidateName)).toEqual([
      'Jan Kowalski',
      'Anna Nowak',
    ]);
    expect(all.body.items[0]).toMatchObject({
      roleName: 'Backend Developer',
      targetLevel: 'B2',
      status: 'IN_PROGRESS',
      recommendation: null,
    });

    expect((await list({ q: 'nowak' }).expect(200)).body.items).toHaveLength(1);
    expect((await list({ status: 'CREATED' }).expect(200)).body.items[0].candidateName).toBe(
      'Anna Nowak',
    );
    expect((await list({ role: 'business-analyst' }).expect(200)).body.items).toHaveLength(0);
    await list({ status: 'BOGUS' }).expect(400);
  });
});

describe('GET /admin/assessments/:id', () => {
  it('includes the candidate link while the conversation can start', async () => {
    const auth = await token();
    const created = await createAssessment(auth);
    const res = await http()
      .get(`/admin/assessments/${created.id}`)
      .set('Authorization', `Bearer ${auth}`)
      .expect(200);
    expect(res.body.candidateLink).toBe(created.link);
  });
});

describe('DELETE /admin/assessments/:id/data', () => {
  it('deletes transcript, recordings and reports, anonymises and kills the link', async () => {
    const auth = await token();
    const created = await createAssessment(auth, 'Anna Nowak');
    await http().post(`/public/assessments/${created.token}/consent`).expect(200);
    await http().post(`/public/assessments/${created.token}/realtime-session`).expect(200);
    await http()
      .post(`/public/assessments/${created.token}/turns`)
      .send({ turns: [{ seq: 0, speaker: 'CANDIDATE', text: 'Hello', startedAtMs: 0 }] })
      .expect(200);
    const upload = await http()
      .post(`/public/assessments/${created.token}/recording`)
      .attach('file', Buffer.from('audio'), { filename: 'r.webm', contentType: 'audio/webm' })
      .expect(201);
    const recording = await ctx.prisma.recording.findUniqueOrThrow({
      where: { id: upload.body.id },
    });

    const res = await http()
      .delete(`/admin/assessments/${created.id}/data`)
      .set('Authorization', `Bearer ${auth}`)
      .expect(200);
    expect(res.body).toMatchObject({
      candidateName: '[dane usunięte]',
      candidateEmail: null,
      candidateLink: null,
      turns: [],
      recordings: [],
      report: null,
    });
    expect(res.body.dataDeletedAt).not.toBeNull();
    // Gone from the list (the report page still shows what happened).
    const list = await http()
      .get('/admin/assessments')
      .set('Authorization', `Bearer ${auth}`)
      .expect(200);
    expect(list.body.items.map((i: { id: string }) => i.id)).not.toContain(created.id);
    expect(await ctx.prisma.transcriptTurn.count()).toBe(0);
    expect(await ctx.prisma.recording.count()).toBe(0);
    await expect(ctx.app.get(Storage).get(recording.storageKey)).rejects.toThrow();

    // The old candidate link no longer works, and it cannot be evaluated.
    await http().get(`/public/assessments/${created.token}`).expect(404);
    await http()
      .post(`/admin/assessments/${created.id}/evaluate`)
      .set('Authorization', `Bearer ${auth}`)
      .expect(409);
  });

  it('returns 404 for an unknown assessment', async () => {
    const auth = await token();
    await http()
      .delete('/admin/assessments/unknown/data')
      .set('Authorization', `Bearer ${auth}`)
      .expect(404);
  });
});

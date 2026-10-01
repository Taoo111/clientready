import { randomBytes, randomUUID } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';
import type { CreateAssessmentResult, Report } from '@clientready/shared';
import pg from 'pg';
import { pl } from '../src/i18n/pl';
import { ADMIN, ADMIN_API_KEY, API_URL, E2E_DATABASE_URL } from './env';

/** Creates an assessment through the API (as a script would, with the admin key). */
export async function createAssessment(
  request: APIRequestContext,
  candidateName = 'Anna Kowalska',
): Promise<CreateAssessmentResult> {
  const res = await request.post(`${API_URL}/admin/assessments`, {
    headers: { 'x-admin-key': ADMIN_API_KEY },
    data: { roleTemplateId: 'backend-developer', targetLevel: 'B2', candidateName },
  });
  if (!res.ok()) throw new Error(`Creating an assessment failed: ${res.status()}`);
  return (await res.json()) as CreateAssessmentResult;
}

export async function logIn(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.getByLabel(pl.login.email).fill(ADMIN.email);
  await page.getByLabel(pl.login.password).fill(ADMIN.password);
  await page.getByRole('button', { name: pl.login.submit }).click();
  await page.waitForURL('**/admin');
}

const report: Report = {
  status: 'OK',
  targetLevel: 'B2',
  insufficientReason: null,
  recommendation: 'READY',
  modelRecommendation: 'READY',
  summary: 'Kandydat jasno tłumaczy decyzje techniczne i spokojnie reaguje na presję.',
  cefr: {
    speaking: { level: 'B2', justification: 'Płynne, zrozumiałe wypowiedzi.' },
    listening: { level: 'C1', justification: 'Rozumie wszystkie pytania.' },
  },
  criteria: [
    {
      key: 'understanding_questions',
      name: 'Understanding questions',
      score: 4,
      comment: 'Odpowiada na temat.',
      evidence: [{ seq: 1, quote: 'we moved the payouts to a queue' }],
      rejectedQuotes: 0,
    },
  ],
  language: { nonEnglishDetected: false, notes: null },
  stats: {
    conversationMs: 600_000,
    candidateTurns: 1,
    candidateWords: 20,
    candidateSpeechMs: 240_000,
  },
};

/** Inserts a finished, evaluated assessment (READY) directly into the test database. */
export async function seedEvaluatedAssessment(candidateName: string): Promise<string> {
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    const id = `ui-${randomUUID()}`;
    const started = new Date(Date.now() - 15 * 60_000);
    const ended = new Date(started.getTime() + 10 * 60_000);
    await client.query(
      `INSERT INTO "Assessment" (id, "roleTemplateId", "targetLevel", "candidateName", token,
         status, "consentAt", "startedAt", "endedAt", "updatedAt")
       VALUES ($1, 'backend-developer', 'B2', $2, $3, 'EVALUATED', $4, $4, $5, now())`,
      [id, candidateName, randomBytes(32).toString('base64url'), started, ended],
    );
    await client.query(
      `INSERT INTO "TranscriptTurn" (id, "assessmentId", speaker, text, "startedAtMs", seq)
       VALUES ($1, $2, 'AI', 'Why did you change the payout flow?', 0, 0),
              ($3, $2, 'CANDIDATE', 'Well, we moved the payouts to a queue because it was slow.', 4000, 1)`,
      [randomUUID(), id, randomUUID()],
    );
    await client.query(
      `INSERT INTO "Report" (id, "assessmentId", json, provider, model, "promptVersion")
       VALUES ($1, $2, $3, 'openai', 'seeded', 'evaluation-v2')`,
      [randomUUID(), id, JSON.stringify(report)],
    );
    return id;
  } finally {
    await client.end();
  }
}

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { purgeExpiredData } from '../src/retention/purge';
import { Storage } from '../src/infra/storage/storage';
import { createTestApp, resetDatabase, type TestContext } from './test-app';

let ctx: TestContext;
const DAY = 24 * 60 * 60_000;
const now = new Date('2026-12-31T12:00:00Z');

async function seed(name: string, createdDaysAgo: number, endedDaysAgo: number | null) {
  const storage = ctx.app.get(Storage);
  const assessment = await ctx.prisma.assessment.create({
    data: {
      roleTemplateId: 'backend-developer',
      targetLevel: 'B2',
      candidateName: name,
      token: `token-${name}-${'x'.repeat(30)}`,
      status: endedDaysAgo === null ? 'CREATED' : 'EVALUATED',
      createdAt: new Date(now.getTime() - createdDaysAgo * DAY),
      startedAt: endedDaysAgo === null ? null : new Date(now.getTime() - endedDaysAgo * DAY),
      endedAt: endedDaysAgo === null ? null : new Date(now.getTime() - endedDaysAgo * DAY),
      turns: { create: [{ seq: 0, speaker: 'CANDIDATE', text: 'Hello', startedAtMs: 0 }] },
      reports: {
        create: [{ json: {}, provider: 'rules', model: 'none', promptVersion: 'evaluation-v2' }],
      },
    },
  });
  const storageKey = `recordings/${assessment.id}/a.webm`;
  await storage.put(storageKey, Buffer.from('audio'), 'audio/webm');
  await ctx.prisma.recording.create({
    data: { assessmentId: assessment.id, storageKey, mimeType: 'audio/webm' },
  });
  return { id: assessment.id, storageKey };
}

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.app.close();
});

beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

describe('purgeExpiredData', () => {
  it('deletes assessments past retention with transcripts, reports and recording files', async () => {
    const storage = ctx.app.get(Storage);
    const old = await seed('old', 120, 100);
    const oldUnused = await seed('unused', 95, null);
    const recent = await seed('recent', 100, 30); // created long ago, but ended recently

    const result = await purgeExpiredData(ctx.prisma, storage, { now, retentionDays: 90 });
    expect(result).toMatchObject({ assessments: 2, recordingFiles: 2 });

    const remaining = await ctx.prisma.assessment.findMany({ select: { id: true } });
    expect(remaining.map((a) => a.id)).toEqual([recent.id]);
    expect(await ctx.prisma.transcriptTurn.count()).toBe(1);
    expect(await ctx.prisma.report.count()).toBe(1);
    expect(await ctx.prisma.recording.count()).toBe(1);
    await expect(storage.get(old.storageKey)).rejects.toThrow();
    await expect(storage.get(oldUnused.storageKey)).rejects.toThrow();
    await expect(storage.get(recent.storageKey)).resolves.toBeInstanceOf(Buffer);
  });

  it('changes nothing in dry-run mode', async () => {
    const old = await seed('old', 120, 100);
    const result = await purgeExpiredData(ctx.prisma, ctx.app.get(Storage), {
      now,
      retentionDays: 90,
      dryRun: true,
    });
    expect(result.assessments).toBe(1);
    expect(await ctx.prisma.assessment.count()).toBe(1);
    await expect(ctx.app.get(Storage).get(old.storageKey)).resolves.toBeInstanceOf(Buffer);
  });
});

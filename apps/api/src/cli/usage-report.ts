/**
 * Estimated AI cost per assessment, from the token usage recorded during conversations and
 * evaluations (list prices in usage/pricing.ts). No AI calls.
 *
 *   pnpm usage-report [--days 30]
 */
import { parseArgs } from 'node:util';
import { createPrismaClient } from '../infra/prisma/create-prisma-client';
import { summariseCost } from '../usage/cost-summary';
import { cliArgs, loadEnv, runCli } from './cli';

const usd = (value: number) => `$${value.toFixed(3)}`;

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: cliArgs(),
    options: { days: { type: 'string', default: '30' } },
  });
  const since = new Date(Date.now() - Number(values.days) * 24 * 60 * 60_000);
  const prisma = createPrismaClient(loadEnv());
  try {
    const assessments = await prisma.assessment.findMany({
      where: { usage: { some: { createdAt: { gte: since } } } },
      include: { usage: true },
      orderBy: { createdAt: 'asc' },
    });
    if (assessments.length === 0) {
      console.log(`No recorded usage in the last ${values.days} days.`);
      return;
    }

    const rows = assessments.map((a) => {
      const cost = summariseCost(a.usage);
      const minutes =
        a.startedAt && a.endedAt ? (a.endedAt.getTime() - a.startedAt.getTime()) / 60_000 : null;
      return {
        created: a.createdAt.toISOString().slice(0, 10),
        role: a.roleTemplateId,
        model: a.realtimeModel ?? '-',
        min: minutes === null ? '-' : minutes.toFixed(1),
        connections: a.connectCount,
        realtime: usd(cost.bySource.REALTIME),
        transcription: usd(cost.bySource.TRANSCRIPTION),
        evaluation: usd(cost.bySource.EVALUATION),
        total: usd(cost.totalUsd),
        unpriced: cost.unpricedModels.join(', '),
        totalUsd: cost.totalUsd,
      };
    });
    console.table(rows.map(({ totalUsd: _, ...row }) => row));

    const total = rows.reduce((sum, r) => sum + r.totalUsd, 0);
    console.log(
      `${rows.length} assessment(s), total ${usd(total)}, average ${usd(total / rows.length)} per assessment.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

runCli(main);

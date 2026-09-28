/**
 * Creates an assessment and prints the candidate link — for testing without the recruiter panel.
 *
 *   pnpm create-assessment --name "Jan Kowalski" [--role backend-developer] [--level B2] [--email jan@example.com]
 */
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { CreateAssessmentInputSchema, listRoleTemplates } from '@clientready/shared';
import { z } from 'zod';
import { createAssessment } from '../assessments/create-assessment';
import { validateEnv } from '../config/env';
import { PrismaClient } from '../generated/prisma/client';
import { pgOptions } from '../prisma/pg-options';

loadDotenv({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });

const USAGE = `Usage: pnpm create-assessment --name "<candidate name>" [--role <id>] [--level B1|B2|C1] [--email <email>]
Roles: ${listRoleTemplates()
  .map((t) => t.id)
  .join(', ')}`;

async function main(): Promise<void> {
  const { values } = parseArgs({
    // pnpm forwards a literal "--" when the script is called as `pnpm create-assessment -- ...`.
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: {
      name: { type: 'string' },
      role: { type: 'string', default: 'backend-developer' },
      level: { type: 'string', default: 'B2' },
      email: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }

  const parsed = CreateAssessmentInputSchema.safeParse({
    roleTemplateId: values.role,
    targetLevel: values.level,
    candidateName: values.name,
    candidateEmail: values.email,
  });
  if (!parsed.success) {
    console.error(z.prettifyError(parsed.error));
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const env = validateEnv(process.env);
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pgOptions(env.DATABASE_URL, 2, env.DATABASE_SSL_CA)),
  });
  try {
    const result = await createAssessment(prisma, parsed.data, env.WEB_ORIGIN);
    console.log(`Assessment created: ${result.id}`);
    console.log(`Candidate link:     ${result.link}`);
    console.log(
      `Report (recruiter): ${new URL(`/admin/assessments/${result.id}`, env.WEB_ORIGIN).toString()}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

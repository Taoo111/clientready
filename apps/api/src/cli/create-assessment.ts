/**
 * Creates an assessment and prints the candidate link — for testing without the recruiter panel.
 *
 *   pnpm create-assessment --name "Jan Kowalski" [--role backend-developer] [--level B2] [--email jan@example.com]
 */
import { parseArgs } from 'node:util';
import { CreateAssessmentInputSchema, listRoleTemplates } from '@clientready/shared';
import { z } from 'zod';
import { createAssessment } from '../assessments/create-assessment';
import { createPrismaClient } from '../infra/prisma/create-prisma-client';
import { cliArgs, loadEnv, runCli } from './cli';

const USAGE = `Usage: pnpm create-assessment --name "<candidate name>" [--role <id>] [--level B1|B2|C1] [--email <email>]
Roles: ${listRoleTemplates()
  .map((t) => t.id)
  .join(', ')}`;

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: cliArgs(),
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

  const env = loadEnv();
  const prisma = createPrismaClient(env);
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

runCli(main);

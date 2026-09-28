import { randomBytes } from 'node:crypto';
import { getRoleTemplate, type CreateAssessmentInput } from '@clientready/shared';
import type { PrismaClient } from '../generated/prisma/client';

export class UnknownRoleTemplateError extends Error {
  constructor(readonly roleTemplateId: string) {
    super(`Unknown role template: ${roleTemplateId}`);
  }
}

/** 256-bit, URL-safe, unguessable candidate token. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function candidateLink(webOrigin: string, token: string): string {
  return new URL(`/a/${token}`, webOrigin).toString();
}

/**
 * Creates an assessment. Plain function (no Nest DI) so the CLI can reuse it.
 */
export async function createAssessment(
  prisma: Pick<PrismaClient, 'assessment'>,
  input: CreateAssessmentInput,
  webOrigin: string,
): Promise<{ id: string; token: string; link: string }> {
  if (!getRoleTemplate(input.roleTemplateId)) {
    throw new UnknownRoleTemplateError(input.roleTemplateId);
  }
  const token = generateToken();
  const assessment = await prisma.assessment.create({
    data: {
      roleTemplateId: input.roleTemplateId,
      targetLevel: input.targetLevel,
      candidateName: input.candidateName,
      candidateEmail: input.candidateEmail ?? null,
      token,
    },
  });
  return { id: assessment.id, token, link: candidateLink(webOrigin, token) };
}

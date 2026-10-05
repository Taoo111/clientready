import {
  SESSION_HARD_LIMIT_MS,
  type PublicAssessmentView,
  type RoleTemplate,
} from '@clientready/shared';
import { canResume, elapsedMs } from '../assessments/assessment-rules';
import type { Assessment } from '../generated/prisma/client';

/** What the candidate's browser may know about an assessment (no ids, e-mail or level). */
export function toPublicView(
  assessment: Assessment,
  template: RoleTemplate,
  now: Date,
): PublicAssessmentView {
  return {
    status: assessment.status,
    candidateName: assessment.candidateName,
    roleName: template.name,
    client: template.persona.card,
    consentGiven: assessment.consentAt !== null,
    durationLimitMs: SESSION_HARD_LIMIT_MS,
    elapsedMs: elapsedMs(assessment, now),
    canStart: assessment.status === 'CREATED',
    canResume: canResume(assessment, now),
  };
}

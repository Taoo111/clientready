import {
  getRoleTemplate,
  ReportSchema,
  type AdminAssessmentDetail,
  type AdminAssessmentListItem,
} from '@clientready/shared';
import type {
  Assessment,
  Recording,
  RecruiterDecision,
  Report,
  TranscriptTurn,
} from '../generated/prisma/client';

/** Database rows -> recruiter-panel DTOs. Pure: no I/O, no Nest. */

const iso = (date: Date | null) => date?.toISOString() ?? null;

function roleName(roleTemplateId: string): string {
  return getRoleTemplate(roleTemplateId)?.name ?? roleTemplateId;
}

export function toListItem(
  assessment: Assessment & {
    reports: Pick<Report, 'id' | 'json'>[];
    decisions: Pick<RecruiterDecision, 'verdict' | 'agreesWithAi' | 'reportId'>[];
  },
): AdminAssessmentListItem {
  const latest = assessment.reports[0];
  const report = latest ? ReportSchema.safeParse(latest.json) : undefined;
  // A decision about an older report (evaluation re-run since) does not count as reviewed.
  const decision = assessment.decisions[0];
  const currentDecision = decision && decision.reportId === latest?.id ? decision : undefined;
  return {
    id: assessment.id,
    candidateName: assessment.candidateName,
    roleTemplateId: assessment.roleTemplateId,
    roleName: roleName(assessment.roleTemplateId),
    targetLevel: assessment.targetLevel,
    status: assessment.status,
    recommendation: report?.success ? report.data.recommendation : null,
    reportStatus: report?.success ? report.data.status : null,
    decision: currentDecision
      ? { verdict: currentDecision.verdict, agreesWithAi: currentDecision.agreesWithAi }
      : null,
    createdAt: assessment.createdAt.toISOString(),
    endedAt: iso(assessment.endedAt),
    dataDeleted: assessment.dataDeletedAt !== null,
  };
}

export interface DetailParts {
  assessment: Assessment;
  latestReport: Report | undefined;
  latestDecision: RecruiterDecision | undefined;
  turns: TranscriptTurn[];
  recordings: (Recording & { playbackUrl: string | null })[];
  /** Null when the link can no longer be used (finished, data deleted). */
  candidateLink: string | null;
}

export function toDetail({
  assessment,
  latestReport,
  latestDecision,
  turns,
  recordings,
  candidateLink,
}: DetailParts): AdminAssessmentDetail {
  return {
    id: assessment.id,
    candidateName: assessment.candidateName,
    candidateEmail: assessment.candidateEmail,
    roleTemplateId: assessment.roleTemplateId,
    roleName: roleName(assessment.roleTemplateId),
    targetLevel: assessment.targetLevel,
    status: assessment.status,
    candidateLink,
    dataDeletedAt: iso(assessment.dataDeletedAt),
    createdAt: assessment.createdAt.toISOString(),
    startedAt: iso(assessment.startedAt),
    endedAt: iso(assessment.endedAt),
    evaluationError: assessment.evaluationError,
    report: latestReport
      ? {
          id: latestReport.id,
          provider: latestReport.provider,
          model: latestReport.model,
          promptVersion: latestReport.promptVersion,
          createdAt: latestReport.createdAt.toISOString(),
          data: ReportSchema.parse(latestReport.json),
        }
      : null,
    decision: latestDecision
      ? {
          verdict: latestDecision.verdict,
          agreesWithAi: latestDecision.agreesWithAi,
          comment: latestDecision.comment,
          decidedBy: latestDecision.decidedBy,
          decidedAt: latestDecision.createdAt.toISOString(),
          forCurrentReport: latestDecision.reportId === latestReport?.id,
        }
      : null,
    turns: turns.map((turn) => ({
      seq: turn.seq,
      speaker: turn.speaker,
      text: turn.text,
      startedAtMs: turn.startedAtMs,
    })),
    recordings: recordings.map((recording) => ({
      id: recording.id,
      mimeType: recording.mimeType,
      durationMs: recording.durationMs,
      createdAt: recording.createdAt.toISOString(),
      playbackUrl: recording.playbackUrl,
    })),
  };
}

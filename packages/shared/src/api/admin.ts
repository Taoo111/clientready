import { z } from 'zod';
import {
  AssessmentStatusSchema,
  RecommendationSchema,
  SpeakerSchema,
  TargetLevelSchema,
} from '../enums.js';
import { ReportSchema, ReportStatusSchema } from './report.js';

/** Recruiter panel API (authorised by the recruiter session). */

export const CreateAssessmentInputSchema = z.object({
  roleTemplateId: z.string().min(1),
  targetLevel: TargetLevelSchema,
  candidateName: z.string().trim().min(1).max(200),
  candidateEmail: z.email().optional(),
});
export type CreateAssessmentInput = z.infer<typeof CreateAssessmentInputSchema>;

export const CreateAssessmentResultSchema = z.object({
  id: z.string(),
  token: z.string(),
  /** Link to send to the candidate. */
  link: z.url(),
});
export type CreateAssessmentResult = z.infer<typeof CreateAssessmentResultSchema>;

export const AdminTranscriptTurnSchema = z.object({
  seq: z.number().int(),
  speaker: SpeakerSchema,
  text: z.string(),
  startedAtMs: z.number().int(),
});

export const AdminRecordingSchema = z.object({
  id: z.string(),
  mimeType: z.string(),
  durationMs: z.number().int().nullable(),
  createdAt: z.string(),
  /** Short-lived direct URL (cloud storage); null = stream through the API. */
  playbackUrl: z.string().nullable(),
});

export const AdminAssessmentListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: AssessmentStatusSchema.optional(),
  role: z.string().max(100).optional(),
});
export type AdminAssessmentListQuery = z.infer<typeof AdminAssessmentListQuerySchema>;

export const AdminAssessmentListItemSchema = z.object({
  id: z.string(),
  candidateName: z.string(),
  roleTemplateId: z.string(),
  roleName: z.string(),
  targetLevel: TargetLevelSchema,
  status: AssessmentStatusSchema,
  recommendation: RecommendationSchema.nullable(),
  reportStatus: ReportStatusSchema.nullable(),
  /** The recruiter's decision on the current report; null = not reviewed yet. */
  decision: z.object({ verdict: RecommendationSchema, agreesWithAi: z.boolean() }).nullable(),
  createdAt: z.string(),
  endedAt: z.string().nullable(),
  dataDeleted: z.boolean(),
});
export type AdminAssessmentListItem = z.infer<typeof AdminAssessmentListItemSchema>;

export const AdminAssessmentListSchema = z.object({
  items: z.array(AdminAssessmentListItemSchema),
  /** Number of assessments overall (without filters), for the empty state. */
  total: z.number().int(),
});
export type AdminAssessmentList = z.infer<typeof AdminAssessmentListSchema>;

/** Longest allowed comment on a recruiter decision. */
export const DECISION_COMMENT_MAX = 2000;
/** A verdict that differs from the AI must be explained in at least this many characters. */
export const DECISION_COMMENT_MIN = 10;

/**
 * The recruiter's own verdict on the current report. A comment is required when it differs
 * from the AI recommendation (checked by the API, which knows the recommendation).
 */
export const RecruiterDecisionInputSchema = z.object({
  verdict: RecommendationSchema,
  comment: z.string().trim().max(DECISION_COMMENT_MAX).optional(),
});
export type RecruiterDecisionInput = z.infer<typeof RecruiterDecisionInputSchema>;

export const RecruiterDecisionSchema = z.object({
  verdict: RecommendationSchema,
  agreesWithAi: z.boolean(),
  comment: z.string().nullable(),
  decidedBy: z.string(),
  decidedAt: z.string(),
  /** False when the evaluation was re-run after the decision (it refers to an older report). */
  forCurrentReport: z.boolean(),
});
export type RecruiterDecision = z.infer<typeof RecruiterDecisionSchema>;

export const AdminAssessmentDetailSchema = z.object({
  id: z.string(),
  candidateName: z.string(),
  candidateEmail: z.string().nullable(),
  roleTemplateId: z.string(),
  roleName: z.string(),
  targetLevel: TargetLevelSchema,
  status: AssessmentStatusSchema,
  /** Candidate link, while the conversation can still be started or resumed. */
  candidateLink: z.string().nullable(),
  dataDeletedAt: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  evaluationError: z.string().nullable(),
  report: z
    .object({
      id: z.string(),
      provider: z.string(),
      model: z.string(),
      promptVersion: z.string(),
      createdAt: z.string(),
      data: ReportSchema,
    })
    .nullable(),
  /** The newest recruiter decision, if any. */
  decision: RecruiterDecisionSchema.nullable(),
  turns: z.array(AdminTranscriptTurnSchema),
  recordings: z.array(AdminRecordingSchema),
});
export type AdminAssessmentDetail = z.infer<typeof AdminAssessmentDetailSchema>;

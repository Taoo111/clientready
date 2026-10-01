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
  turns: z.array(AdminTranscriptTurnSchema),
  recordings: z.array(AdminRecordingSchema),
});
export type AdminAssessmentDetail = z.infer<typeof AdminAssessmentDetailSchema>;

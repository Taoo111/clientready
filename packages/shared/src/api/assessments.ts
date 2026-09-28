import { z } from 'zod';
import { AssessmentStatusSchema, SpeakerSchema, TargetLevelSchema } from '../enums.js';

/** The conversation is hard-stopped after this long (measured from the first connect). */
export const SESSION_HARD_LIMIT_MS = 12 * 60_000;
/** The AI client starts wrapping up the conversation at this point. */
export const WRAP_UP_AT_MS = 11 * 60_000;

// --- Admin -------------------------------------------------------------------

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

// --- Public (candidate, by token) --------------------------------------------

/** What the candidate's browser may see about an assessment. No email, ids or level. */
export const PublicAssessmentViewSchema = z.object({
  status: AssessmentStatusSchema,
  candidateName: z.string(),
  roleName: z.string(),
  consentGiven: z.boolean(),
  durationLimitMs: z.number().int(),
  /** Time elapsed since the conversation started; 0 before it started. */
  elapsedMs: z.number().int(),
  /** A new conversation can be started (status CREATED). */
  canStart: z.boolean(),
  /** An interrupted conversation can be resumed (status IN_PROGRESS with time left). */
  canResume: z.boolean(),
});
export type PublicAssessmentView = z.infer<typeof PublicAssessmentViewSchema>;

/** A note injected into the live conversation at a given offset from the start. */
export const TimeCueSchema = z.object({
  atMs: z.number().int().nonnegative(),
  text: z.string().min(1),
});
export type TimeCue = z.infer<typeof TimeCueSchema>;

export const RealtimeSessionResultSchema = z.object({
  /** Short-lived OpenAI Realtime client secret. The real API key never reaches the browser. */
  clientSecret: z.string().min(1),
  /** Unix seconds. */
  expiresAt: z.number().int(),
  model: z.string(),
  isResume: z.boolean(),
  elapsedMs: z.number().int().nonnegative(),
  remainingMs: z.number().int().nonnegative(),
  /** Next free transcript sequence number. */
  nextSeq: z.number().int().nonnegative(),
  /** Cues still ahead of `elapsedMs`. */
  timeCues: z.array(TimeCueSchema),
});
export type RealtimeSessionResult = z.infer<typeof RealtimeSessionResultSchema>;

export const TranscriptTurnInputSchema = z.object({
  seq: z.number().int().nonnegative(),
  speaker: SpeakerSchema,
  text: z.string().trim().min(1).max(4000),
  /** Offset from the conversation start, in milliseconds. */
  startedAtMs: z.number().int().nonnegative(),
  /** How long the turn was spoken (candidate turns: speech start to stop), if known. */
  durationMs: z
    .number()
    .int()
    .nonnegative()
    .max(10 * 60_000)
    .optional(),
});
export type TranscriptTurnInput = z.infer<typeof TranscriptTurnInputSchema>;

export const TranscriptTurnsInputSchema = z.object({
  turns: z.array(TranscriptTurnInputSchema).min(1).max(50),
});
export type TranscriptTurnsInput = z.infer<typeof TranscriptTurnsInputSchema>;

export const RecordingUploadResultSchema = z.object({ id: z.string() });
export type RecordingUploadResult = z.infer<typeof RecordingUploadResultSchema>;

/** Error body returned by the API for candidate-facing failures. */
export const PublicErrorCodeSchema = z.enum([
  'NOT_FOUND',
  'LINK_EXPIRED',
  'ALREADY_COMPLETED',
  'CONSENT_REQUIRED',
  'TIME_UP',
  'TOO_MANY_CONNECTIONS',
  'REALTIME_UNAVAILABLE',
]);
export type PublicErrorCode = z.infer<typeof PublicErrorCodeSchema>;

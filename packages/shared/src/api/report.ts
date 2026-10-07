import { z } from 'zod';
import { RecommendationSchema, TargetLevelSchema } from '../enums.js';

export const CefrLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export type CefrLevel = z.infer<typeof CefrLevelSchema>;

const CEFR_ORDER: readonly CefrLevel[] = CefrLevelSchema.options;

/** Position on the CEFR scale (A1 = 0 … C2 = 5), for comparisons with the target level. */
export function cefrRank(level: CefrLevel): number {
  return CEFR_ORDER.indexOf(level);
}

export const CefrEstimateSchema = z.object({
  level: CefrLevelSchema,
  /** Short justification, in Polish. */
  justification: z.string().min(1),
});
export type CefrEstimate = z.infer<typeof CefrEstimateSchema>;

export const EvidenceKindSchema = z.enum(['strength', 'weakness']);
export type EvidenceKind = z.infer<typeof EvidenceKindSchema>;

export const EvidenceQuoteSchema = z.object({
  /** Verbatim candidate quote, verified against the transcript. */
  quote: z.string().min(1),
  /** Transcript turn the quote was found in. */
  seq: z.number().int().nonnegative(),
  /** What the quote shows for its criterion; missing in reports before evaluation-v5. */
  kind: EvidenceKindSchema.optional(),
});
export type EvidenceQuote = z.infer<typeof EvidenceQuoteSchema>;

export const CriterionResultSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  score: z.number().int().min(1).max(5),
  /** Short comment, in Polish. */
  comment: z.string().min(1),
  evidence: z.array(EvidenceQuoteSchema).max(3),
  /** Quotes returned by the model that could not be found in the transcript. */
  rejectedQuotes: z.number().int().nonnegative(),
});
export type CriterionResult = z.infer<typeof CriterionResultSchema>;

export const ReportStatusSchema = z.enum(['OK', 'INSUFFICIENT_DATA']);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const TranscriptStatsSchema = z.object({
  conversationMs: z.number().int().nonnegative(),
  candidateTurns: z.number().int().nonnegative(),
  candidateWords: z.number().int().nonnegative(),
  /** Measured from speech start/stop events, or estimated from word count. */
  candidateSpeechMs: z.number().int().nonnegative(),
});
export type TranscriptStats = z.infer<typeof TranscriptStatsSchema>;

/** Report stored in `Report.json` and shown to the recruiter. Texts are in Polish. */
export const ReportSchema = z.object({
  status: ReportStatusSchema,
  targetLevel: TargetLevelSchema,
  /** Why the data was insufficient (status INSUFFICIENT_DATA). */
  insufficientReason: z.string().nullable(),
  /** Null when status is INSUFFICIENT_DATA — no scores are made up. */
  recommendation: RecommendationSchema.nullable(),
  /** What the evaluation model itself suggested (kept for calibration). */
  modelRecommendation: RecommendationSchema.nullable(),
  summary: z.string(),
  cefr: z.object({ speaking: CefrEstimateSchema, listening: CefrEstimateSchema }).nullable(),
  criteria: z.array(CriterionResultSchema),
  language: z.object({
    /** The candidate spoke Polish (or another language) at some point. */
    nonEnglishDetected: z.boolean(),
    notes: z.string().nullable(),
  }),
  stats: TranscriptStatsSchema,
});
export type Report = z.infer<typeof ReportSchema>;

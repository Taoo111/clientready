import { z } from 'zod';

export const TargetLevelSchema = z.enum(['B1', 'B2', 'C1']);
export type TargetLevel = z.infer<typeof TargetLevelSchema>;

export const AssessmentStatusSchema = z.enum([
  'CREATED',
  'IN_PROGRESS',
  'COMPLETED',
  'EVALUATED',
  'FAILED',
]);
export type AssessmentStatus = z.infer<typeof AssessmentStatusSchema>;

export const SpeakerSchema = z.enum(['AI', 'CANDIDATE']);
export type Speaker = z.infer<typeof SpeakerSchema>;

export const RecommendationSchema = z.enum(['READY', 'READY_WITH_CONCERNS', 'NOT_READY']);
export type Recommendation = z.infer<typeof RecommendationSchema>;

import { z } from 'zod';

/** Default client-readiness criteria; a role template may override them. */
export const DEFAULT_CRITERIA_KEYS = [
  'understanding_questions',
  'vocabulary_precision',
  'clarifying_questions',
  'handling_pressure',
  'fluency_coherence',
] as const;

export const PersonaSchema = z.object({
  /** Who the AI client is, e.g. "Head of Product at a logistics SaaS". */
  role: z.string().min(1),
  company: z.string().min(1),
  product: z.string().min(1),
  personality: z.string().min(1),
  /** How demanding the client is and how they push back. */
  demandingness: z.string().min(1),
});

export const PhaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  goal: z.string().min(1),
  suggestedQuestions: z.array(z.string().min(1)).min(1),
  followUpGuidance: z.string().min(1),
  targetDurationSec: z.number().int().positive(),
});

export const RubricCriterionSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  score1: z.string().min(1),
  score3: z.string().min(1),
  score5: z.string().min(1),
});

export const LevelAdjustmentSchema = z.object({
  /** How the client's language, pace and difficulty change for this target level. */
  guidance: z.string().min(1),
});

export const RoleTemplateSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id must be kebab-case'),
  name: z.string().min(1),
  description: z.string().min(1),
  persona: PersonaSchema,
  phases: z.array(PhaseSchema).min(1),
  rubric: z.array(RubricCriterionSchema).min(1),
  levels: z.object({
    B1: LevelAdjustmentSchema,
    B2: LevelAdjustmentSchema,
    C1: LevelAdjustmentSchema,
  }),
});

export type Persona = z.infer<typeof PersonaSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type RubricCriterion = z.infer<typeof RubricCriterionSchema>;
export type RoleTemplate = z.infer<typeof RoleTemplateSchema>;

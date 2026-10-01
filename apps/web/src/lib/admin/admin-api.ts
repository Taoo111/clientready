import {
  AdminAssessmentDetailSchema,
  AdminAssessmentListSchema,
  CreateAssessmentResultSchema,
  type AdminAssessmentDetail,
  type AdminAssessmentList,
  type CreateAssessmentInput,
  type CreateAssessmentResult,
} from '@clientready/shared';
import { apiFetch, ApiUnavailableError } from './session';

/**
 * Typed recruiter API (server-side only): pages and server actions call these functions,
 * never raw URLs. Reads let `ApiUnavailableError` through (the panel shows the wake-up
 * screen); mutations report an unreachable API as a failure.
 */

const assessmentPath = (id: string) => `/admin/assessments/${encodeURIComponent(id)}`;

/** Treats an unreachable API as a failed request; other errors (incl. redirects) propagate. */
function nullIfUnavailable(error: unknown): null {
  if (error instanceof ApiUnavailableError) return null;
  throw error;
}

export interface AssessmentFilters {
  q?: string;
  status?: string;
  role?: string;
}

export const adminApi = {
  /** Null when the API answered with an error. */
  async listAssessments(filters: AssessmentFilters): Promise<AdminAssessmentList | null> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) query.set(key, value);
    }
    const res = await apiFetch(`/admin/assessments${query.size ? `?${query}` : ''}`);
    return res.ok ? AdminAssessmentListSchema.parse(await res.json()) : null;
  },

  async getAssessment(id: string): Promise<AdminAssessmentDetail | 'not-found' | 'error'> {
    const res = await apiFetch(assessmentPath(id));
    if (res.status === 404) return 'not-found';
    if (!res.ok) return 'error';
    return AdminAssessmentDetailSchema.parse(await res.json());
  },

  /** Null when the API is unreachable or rejected the input. */
  async createAssessment(input: CreateAssessmentInput): Promise<CreateAssessmentResult | null> {
    const res = await apiFetch('/admin/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).catch(nullIfUnavailable);
    return res?.ok ? CreateAssessmentResultSchema.parse(await res.json()) : null;
  },

  /** Runs the evaluation again (can take minutes); true when a new report was stored. */
  async rerunEvaluation(id: string): Promise<boolean> {
    const res = await apiFetch(`${assessmentPath(id)}/evaluate`, { method: 'POST' }, 240_000).catch(
      nullIfUnavailable,
    );
    return res?.ok ?? false;
  },

  async deleteCandidateData(id: string): Promise<boolean> {
    const res = await apiFetch(`${assessmentPath(id)}/data`, { method: 'DELETE' }).catch(
      nullIfUnavailable,
    );
    return res?.ok ?? false;
  },
};

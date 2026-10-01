'use server';

import {
  CreateAssessmentInputSchema,
  LoginInputSchema,
  LoginResultSchema,
} from '@clientready/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { pl } from '@/i18n/pl';
import { adminApi } from '@/lib/admin/admin-api';
import { clearSession, publicApiFetch, sessionToken, setSession } from '@/lib/admin/session';

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

/** Only same-site paths inside the panel are allowed as a post-login target. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : '';
  return next.startsWith('/admin') && !next.startsWith('//') && !next.startsWith('/admin/login')
    ? next
    : '/admin';
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '');
  const parsed = LoginInputSchema.safeParse({ email, password: formData.get('password') });
  if (!parsed.success) return { error: pl.login.invalid, values: { email } };

  let res: Response;
  try {
    res = await publicApiFetch(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      },
      90_000,
    );
  } catch {
    return { error: pl.login.unavailable, values: { email } };
  }
  if (res.status === 429) return { error: pl.login.tooMany, values: { email } };
  if (!res.ok) {
    return {
      error: res.status === 401 ? pl.login.invalid : pl.login.unavailable,
      values: { email },
    };
  }
  const session = LoginResultSchema.parse(await res.json());
  await setSession(session.token, session.expiresAt);
  redirect(safeNext(formData.get('next')));
}

export async function logoutAction(): Promise<void> {
  const token = await sessionToken();
  if (token) {
    await publicApiFetch('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
  await clearSession();
  redirect('/admin/login');
}

export async function createAssessmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = {
    candidateName: String(formData.get('candidateName') ?? ''),
    candidateEmail: String(formData.get('candidateEmail') ?? '').trim(),
    roleTemplateId: String(formData.get('roleTemplateId') ?? ''),
    targetLevel: String(formData.get('targetLevel') ?? ''),
  };
  const parsed = CreateAssessmentInputSchema.safeParse({
    ...values,
    candidateEmail: values.candidateEmail || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]) as keyof typeof pl.create.errors;
      fieldErrors[key] = pl.create.errors[key] ?? pl.create.errors.generic;
    }
    return { fieldErrors, values };
  }

  const created = await adminApi.createAssessment(parsed.data);
  if (!created) return { error: pl.create.errors.generic, values };
  revalidatePath('/admin');
  redirect(`/admin/assessments/${created.id}?created=1`);
}

export interface ActionResult {
  ok: boolean;
}

export async function rerunEvaluationAction(id: string): Promise<ActionResult> {
  const ok = await adminApi.rerunEvaluation(id);
  revalidatePath(`/admin/assessments/${id}`);
  return { ok };
}

export async function deleteCandidateDataAction(id: string): Promise<ActionResult> {
  const ok = await adminApi.deleteCandidateData(id);
  revalidatePath(`/admin/assessments/${id}`);
  revalidatePath('/admin');
  return { ok };
}

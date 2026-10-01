'use client';

import type { TargetLevel } from '@clientready/shared';
import { ArrowRight, CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';
import { createAssessmentAction, type FormState } from '@/app/admin/actions';
import { Notice } from '@/components/common/notice';
import { Spinner } from '@/components/common/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

const LEVELS: TargetLevel[] = ['B1', 'B2', 'C1'];

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-danger">
      {message}
    </p>
  );
}

export function CreateAssessmentForm({
  roles,
}: {
  roles: { id: string; name: string; description: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createAssessmentAction, {});
  const t = pl.create;
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form action={action} className="space-y-6" noValidate>
      {state.error && (
        <Notice tone="danger" icon={CircleAlert}>
          {state.error}
        </Notice>
      )}

      <div className="space-y-2">
        <Label htmlFor="candidateName">{t.candidateName}</Label>
        <Input
          id="candidateName"
          name="candidateName"
          placeholder={t.candidateNamePlaceholder}
          defaultValue={values.candidateName}
          autoComplete="off"
          required
          autoFocus
          aria-invalid={!!errors.candidateName}
          aria-describedby={errors.candidateName ? 'candidateName-error' : undefined}
        />
        <FieldError id="candidateName-error" message={errors.candidateName} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="candidateEmail">
          {t.candidateEmail}{' '}
          <span className="font-normal text-muted-foreground">({t.optional})</span>
        </Label>
        <Input
          id="candidateEmail"
          name="candidateEmail"
          type="email"
          defaultValue={values.candidateEmail}
          autoComplete="off"
          aria-invalid={!!errors.candidateEmail}
          aria-describedby="candidateEmail-hint"
        />
        <p id="candidateEmail-hint" className="text-sm text-muted-foreground">
          {t.candidateEmailHint}
        </p>
        <FieldError id="candidateEmail-error" message={errors.candidateEmail} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="roleTemplateId">{t.role}</Label>
        <Select
          name="roleTemplateId"
          defaultValue={values.roleTemplateId || (roles.length === 1 ? roles[0]!.id : undefined)}
        >
          <SelectTrigger
            id="roleTemplateId"
            className="w-full"
            aria-invalid={!!errors.roleTemplateId}
          >
            <SelectValue placeholder={t.rolePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError id="roleTemplateId-error" message={errors.roleTemplateId} />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t.level}</legend>
        <p className="text-sm text-muted-foreground">{t.levelHint}</p>
        <div className="grid gap-2 pt-1 sm:grid-cols-3">
          {LEVELS.map((level) => (
            <label
              key={level}
              className={cn(
                'flex cursor-pointer flex-col gap-0.5 rounded-xl border bg-card p-3 transition-colors hover:border-brand/40',
                'has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
              )}
            >
              <input
                type="radio"
                name="targetLevel"
                value={level}
                defaultChecked={(values.targetLevel || 'B2') === level}
                className="sr-only"
              />
              <span className="font-mono text-sm font-semibold">{level}</span>
              <span className="text-xs text-muted-foreground">
                {t.levels[level].split(' - ')[1]}
              </span>
            </label>
          ))}
        </div>
        <FieldError id="targetLevel-error" message={errors.targetLevel} />
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
        <Button asChild variant="ghost" size="lg">
          <Link href="/admin">{t.cancel}</Link>
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Spinner className="text-current" /> : null}
          {t.submit}
          {!pending && <ArrowRight aria-hidden />}
        </Button>
      </div>
    </form>
  );
}

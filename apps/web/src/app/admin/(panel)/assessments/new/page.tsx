import { listRoleTemplates } from '@clientready/shared';
import type { Metadata } from 'next';
import { BackLink } from '@/components/admin/back-link';
import { CreateAssessmentForm } from '@/components/admin/create-assessment-form';
import { pl } from '@/i18n/pl';

export const metadata: Metadata = { title: pl.create.title };

export default function NewAssessmentPage() {
  const roles = listRoleTemplates().map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
  }));
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{pl.create.title}</h1>
        <p className="text-sm text-muted-foreground">{pl.create.subtitle}</p>
      </div>
      <div className="rounded-xl border bg-card p-5 shadow-card sm:p-8">
        <CreateAssessmentForm roles={roles} />
      </div>
    </div>
  );
}

import { listRoleTemplates } from '@clientready/shared';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
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
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {pl.report.back}
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{pl.create.title}</h1>
        <p className="text-sm text-muted-foreground">{pl.create.subtitle}</p>
      </div>
      <div className="rounded-2xl border bg-card p-5 shadow-card sm:p-8">
        <CreateAssessmentForm roles={roles} />
      </div>
    </div>
  );
}

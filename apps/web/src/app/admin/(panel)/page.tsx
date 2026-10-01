import { listRoleTemplates } from '@clientready/shared';
import { ClipboardList, Plus, SearchX, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AssessmentFilters } from '@/components/admin/assessment-filters';
import { AssessmentList } from '@/components/admin/assessment-list';
import { EmptyState } from '@/components/common/empty-state';
import { Notice } from '@/components/common/notice';
import { Button } from '@/components/ui/button';
import { pl } from '@/i18n/pl';
import { adminApi } from '@/lib/admin/admin-api';

export const metadata: Metadata = { title: pl.list.title };

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; role?: string }>;
}) {
  const { q, status, role } = await searchParams;
  const data = await adminApi.listAssessments({ q, status, role });
  const roles = listRoleTemplates().map((t) => ({ id: t.id, name: t.name }));
  const t = pl.list;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        {data && data.total > 0 && (
          <p className="text-sm text-muted-foreground tabular">{t.count(data.items.length)}</p>
        )}
      </div>

      {!data && (
        <Notice tone="danger" icon={TriangleAlert}>
          {t.loadError}
        </Notice>
      )}

      {data && data.total === 0 && (
        <EmptyState
          icon={ClipboardList}
          title={t.emptyTitle}
          description={t.emptyBody}
          action={
            <Button asChild size="lg">
              <Link href="/admin/assessments/new">
                <Plus aria-hidden />
                {pl.nav.newAssessment}
              </Link>
            </Button>
          }
        />
      )}

      {data && data.total > 0 && (
        <>
          <AssessmentFilters roles={roles} />
          {data.items.length === 0 ? (
            <EmptyState icon={SearchX} title={t.noResultsTitle} description={t.noResultsBody} />
          ) : (
            <AssessmentList items={data.items} />
          )}
        </>
      )}
    </div>
  );
}

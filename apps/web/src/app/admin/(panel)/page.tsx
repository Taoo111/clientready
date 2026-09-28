import {
  AdminAssessmentListSchema,
  listRoleTemplates,
  type AdminAssessmentListItem,
} from '@clientready/shared';
import { ChevronRight, ClipboardList, Plus, SearchX, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AssessmentFilters } from '@/components/admin/assessment-filters';
import { RecommendationBadge, StatusBadge } from '@/components/admin/badges';
import { EmptyState } from '@/components/common/empty-state';
import { Notice } from '@/components/common/notice';
import { Button } from '@/components/ui/button';
import { pl } from '@/i18n/pl';
import { apiFetch } from '@/lib/admin/session';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: pl.list.title };

function Row({ item }: { item: AdminAssessmentListItem }) {
  const href = `/admin/assessments/${item.id}`;
  return (
    <tr className="group relative border-b last:border-0 transition-colors hover:bg-muted/60">
      <td className="py-3.5 pr-4 pl-5">
        <Link
          href={href}
          className="font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
        >
          <span className={item.dataDeleted ? 'text-muted-foreground italic' : undefined}>
            {item.candidateName}
          </span>
        </Link>
      </td>
      <td className="px-4 py-3.5 text-sm text-muted-foreground">{item.roleName}</td>
      <td className="px-4 py-3.5">
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
          {item.targetLevel}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={item.status} deleted={item.dataDeleted} />
      </td>
      <td className="px-4 py-3.5">
        <RecommendationBadge
          recommendation={item.recommendation}
          reportStatus={item.reportStatus}
        />
      </td>
      <td className="px-4 py-3.5 text-sm whitespace-nowrap text-muted-foreground tabular">
        {formatDate(item.createdAt)}
      </td>
      <td className="py-3.5 pr-4 text-muted-foreground">
        <ChevronRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </td>
    </tr>
  );
}

function MobileCard({ item }: { item: AdminAssessmentListItem }) {
  return (
    <li>
      <Link
        href={`/admin/assessments/${item.id}`}
        className="block space-y-3 rounded-xl border bg-card p-4 shadow-card transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={
                item.dataDeleted ? 'truncate text-muted-foreground italic' : 'truncate font-medium'
              }
            >
              {item.candidateName}
            </p>
            <p className="text-sm text-muted-foreground">
              {item.roleName} · <span className="font-mono text-xs">{item.targetLevel}</span>
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground tabular">
            {formatDate(item.createdAt)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={item.status} deleted={item.dataDeleted} />
          {(item.recommendation || item.reportStatus) && (
            <RecommendationBadge
              recommendation={item.recommendation}
              reportStatus={item.reportStatus}
            />
          )}
        </div>
      </Link>
    </li>
  );
}

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; role?: string }>;
}) {
  const { q, status, role } = await searchParams;
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (status) query.set('status', status);
  if (role) query.set('role', role);

  const res = await apiFetch(`/admin/assessments${query.size ? `?${query}` : ''}`);
  const data = res.ok ? AdminAssessmentListSchema.parse(await res.json()) : null;
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
            <>
              <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-card md:block">
                <table className="w-full text-left">
                  <thead className="border-b bg-muted/50 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th scope="col" className="py-3 pr-4 pl-5 font-medium">
                        {t.columns.candidate}
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        {t.columns.role}
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        {t.columns.level}
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        {t.columns.status}
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        {t.columns.recommendation}
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        {t.columns.date}
                      </th>
                      <th scope="col" className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <Row key={item.id} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-3 md:hidden">
                {data.items.map((item) => (
                  <MobileCard key={item.id} item={item} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

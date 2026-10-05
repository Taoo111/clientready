import type { AdminAssessmentListItem } from '@clientready/shared';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { DecisionBadge, RecommendationBadge, StatusBadge } from '@/components/admin/badges';
import { pl } from '@/i18n/pl';
import { formatDate } from '@/lib/format';

const t = pl.list;

/** Assessments as a table on desktop and as cards on mobile. */
export function AssessmentList({ items }: { items: AdminAssessmentListItem[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-card md:block">
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
                {t.columns.decision}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {t.columns.date}
              </th>
              <th scope="col" className="w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {items.map((item) => (
          <MobileCard key={item.id} item={item} />
        ))}
      </ul>
    </>
  );
}

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
      <td className="px-4 py-3.5">
        <DecisionBadge item={item} />
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
          {(item.decision || item.recommendation) && !item.dataDeleted && (
            <DecisionBadge item={item} />
          )}
        </div>
      </Link>
    </li>
  );
}

import { Languages, Trash2, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { BackLink } from '@/components/admin/back-link';
import { AutoRefresh } from '@/components/admin/report/auto-refresh';
import { InviteCard } from '@/components/admin/invite-card';
import { CefrCard } from '@/components/admin/report/cefr-card';
import { CriteriaList } from '@/components/admin/report/criteria-list';
import { DecisionCard } from '@/components/admin/report/decision-card';
import { Recordings } from '@/components/admin/report/recordings';
import { ReportHeader } from '@/components/admin/report/report-header';
import { ReportMeta } from '@/components/admin/report/report-meta';
import { ReportSection } from '@/components/admin/report/report-section';
import { Transcript } from '@/components/admin/report/transcript';
import { Verdict } from '@/components/admin/report/verdict';
import { isWaitingStatus, WaitingNotice } from '@/components/admin/report/waiting-notice';
import { Notice } from '@/components/common/notice';
import { pl } from '@/i18n/pl';
import { adminApi } from '@/lib/admin/admin-api';
import { formatDate, withPlainDashes } from '@/lib/format';

export const metadata: Metadata = { title: pl.report.title };

const t = pl.report;

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const detail = await adminApi.getAssessment(id);

  if (detail === 'not-found' || detail === 'error') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <BackLink />
        <Notice tone="danger" icon={TriangleAlert}>
          {detail === 'not-found' ? t.notFound : t.loadError}
        </Notice>
      </div>
    );
  }

  const report = detail.report ? withPlainDashes(detail.report.data) : null;
  const quotes = new Map<number, string[]>();
  for (const e of report?.criteria.flatMap((c) => c.evidence) ?? []) {
    quotes.set(e.seq, [...(quotes.get(e.seq) ?? []), e.quote]);
  }
  const finished = ['COMPLETED', 'EVALUATED', 'FAILED'].includes(detail.status);
  const deleted = detail.dataDeletedAt !== null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:max-w-none print:space-y-5">
      <div className="print-hidden">
        <BackLink />
      </div>

      <ReportHeader detail={detail} finished={finished} hasReport={report !== null} />

      {deleted && (
        <Notice tone="neutral" icon={Trash2}>
          {t.deletedNotice(formatDate(detail.dataDeletedAt))}
        </Notice>
      )}

      {detail.candidateLink && (
        <InviteCard
          link={detail.candidateLink}
          candidateName={detail.candidateName}
          roleName={detail.roleName}
          highlight={created === '1'}
        />
      )}

      {detail.status === 'FAILED' && detail.evaluationError && (
        <Notice tone="danger" icon={TriangleAlert} title={t.failed}>
          <span className="font-mono text-xs break-all">{detail.evaluationError}</span>
        </Notice>
      )}

      {!report && !deleted && isWaitingStatus(detail.status) && (
        <WaitingNotice status={detail.status} />
      )}
      {!report &&
        !deleted &&
        (detail.status === 'IN_PROGRESS' || detail.status === 'COMPLETED') && <AutoRefresh />}

      {report && <Verdict report={report} />}

      {report?.language.nonEnglishDetected && (
        <Notice tone="warning" icon={Languages} title={t.languageTitle}>
          {report.language.notes}
        </Notice>
      )}

      {report?.cefr && (
        <ReportSection title={t.cefrTitle}>
          <div className="grid gap-4 sm:grid-cols-2">
            <CefrCard label={t.speaking} target={detail.targetLevel} {...report.cefr.speaking} />
            <CefrCard label={t.listening} target={detail.targetLevel} {...report.cefr.listening} />
          </div>
        </ReportSection>
      )}

      {report && report.criteria.length > 0 && (
        <ReportSection title={t.criteriaTitle}>
          <CriteriaList criteria={report.criteria} />
        </ReportSection>
      )}

      {/* After the evidence, not before it: the recruiter decides having read the report. */}
      {report?.recommendation && !deleted && (
        <DecisionCard
          assessmentId={detail.id}
          aiRecommendation={report.recommendation}
          decision={detail.decision}
        />
      )}

      {(detail.recordings.length > 0 || finished) && !deleted && (
        <ReportSection title={t.recordingTitle} className="print-hidden">
          <Recordings assessmentId={detail.id} recordings={detail.recordings} />
        </ReportSection>
      )}

      {(detail.turns.length > 0 || (finished && !deleted)) && (
        <ReportSection title={t.transcriptTitle} className="print:break-before-page">
          <Transcript turns={detail.turns} quotes={quotes} />
        </ReportSection>
      )}

      {detail.report && report && (
        <ReportSection title={t.metaTitle} className="print-avoid-break">
          <ReportMeta stored={detail.report} report={report} />
        </ReportSection>
      )}
    </div>
  );
}

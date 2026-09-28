import {
  AdminAssessmentDetailSchema,
  cefrRank,
  type AdminAssessmentDetail,
  type CefrLevel,
  type Report,
  type TargetLevel,
} from '@clientready/shared';
import {
  ArrowLeft,
  CircleCheck,
  CircleDashed,
  CircleX,
  Hourglass,
  Languages,
  Mic,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/admin/badges';
import { CriteriaList } from '@/components/admin/criteria-list';
import { InviteCard } from '@/components/admin/invite-card';
import { ReportActions } from '@/components/admin/report-actions';
import { Logo } from '@/components/brand/logo';
import { Notice } from '@/components/common/notice';
import { pl } from '@/i18n/pl';
import { apiFetch } from '@/lib/admin/session';
import { formatClock, formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: pl.report.title };

const t = pl.report;

async function load(id: string): Promise<AdminAssessmentDetail | 'not-found' | 'error'> {
  const res = await apiFetch(`/admin/assessments/${encodeURIComponent(id)}`);
  if (res.status === 404) return 'not-found';
  if (!res.ok) return 'error';
  return AdminAssessmentDetailSchema.parse(await res.json());
}

function Section({
  title,
  children,
  className,
  action,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border bg-card p-5 shadow-card sm:p-6 print:border-0 print:p-0 print:shadow-none',
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const verdictStyles = {
  READY: { icon: CircleCheck, box: 'border-success/30 bg-success-soft', text: 'text-success' },
  READY_WITH_CONCERNS: {
    icon: TriangleAlert,
    box: 'border-warning/35 bg-warning-soft',
    text: 'text-warning',
  },
  NOT_READY: { icon: CircleX, box: 'border-danger/30 bg-danger-soft', text: 'text-danger' },
} as const;

function Verdict({ report }: { report: Report }) {
  if (report.status === 'INSUFFICIENT_DATA') {
    return (
      <section className="print-avoid-break rounded-2xl border bg-muted p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <CircleDashed className="mt-0.5 size-8 shrink-0 text-muted-foreground" aria-hidden />
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t.recommendationLabel}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">{t.insufficientTitle}</h2>
            <p className="leading-relaxed text-foreground/85">{report.insufficientReason}</p>
          </div>
        </div>
      </section>
    );
  }
  const recommendation = report.recommendation ?? 'READY_WITH_CONCERNS';
  const style = verdictStyles[recommendation];
  const Icon = style.icon;
  return (
    <section className={cn('print-avoid-break rounded-2xl border p-5 sm:p-7', style.box)}>
      <div className="flex items-start gap-4">
        <Icon className={cn('mt-1 size-9 shrink-0', style.text)} aria-hidden />
        <div className="min-w-0 space-y-3">
          <p className="text-xs font-medium tracking-wide text-foreground/60 uppercase">
            {t.recommendationLabel}
          </p>
          <h2 className={cn('text-2xl font-semibold tracking-tight sm:text-3xl', style.text)}>
            {pl.recommendation[recommendation]}
          </h2>
          <p className="max-w-3xl leading-relaxed text-foreground/90">{report.summary}</p>
          {report.modelRecommendation && report.modelRecommendation !== report.recommendation && (
            <p className="text-sm text-foreground/70">
              {t.modelDisagrees(pl.recommendation[report.modelRecommendation])}
            </p>
          )}
          <p className="flex items-start gap-2 border-t border-foreground/10 pt-3 text-sm text-foreground/70">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t.humanDecision}
          </p>
        </div>
      </div>
    </section>
  );
}

function CefrCard({
  label,
  level,
  justification,
  target,
}: {
  label: string;
  level: CefrLevel;
  justification: string;
  target: TargetLevel;
}) {
  const diff = cefrRank(level) - cefrRank(target);
  const tone = diff >= 0 ? 'text-success' : diff === -1 ? 'text-warning' : 'text-danger';
  return (
    <div className="print-avoid-break space-y-2 rounded-xl border bg-background/60 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{t.vsTarget(target)}</p>
      </div>
      <p className={cn('font-mono text-4xl font-semibold tracking-tight', tone)}>{level}</p>
      <p className="text-sm leading-relaxed text-foreground/80">{justification}</p>
    </div>
  );
}

function Transcript({ detail, quoted }: { detail: AdminAssessmentDetail; quoted: Set<number> }) {
  if (detail.turns.length === 0)
    return <p className="text-sm text-muted-foreground">{t.noTranscript}</p>;
  return (
    <ol className="space-y-3">
      {detail.turns.map((turn) => {
        const ai = turn.speaker === 'AI';
        return (
          <li
            key={turn.seq}
            id={`turn-${turn.seq}`}
            className={cn('flex scroll-mt-24', ai ? 'justify-start' : 'justify-end')}
          >
            <div
              className={cn(
                'print-avoid-break max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[75%]',
                ai ? 'rounded-tl-sm bg-muted' : 'rounded-tr-sm bg-brand-soft',
                quoted.has(turn.seq) && 'ring-2 ring-brand/40',
                'target:ring-2 target:ring-brand',
              )}
            >
              <p className="mb-0.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">
                  {ai ? t.speakerAi : t.speakerCandidate}
                </span>{' '}
                · <span className="tabular">{formatClock(turn.startedAtMs)}</span>
              </p>
              <p className="text-sm leading-relaxed">{turn.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const waitingIcons = { CREATED: Mic, IN_PROGRESS: Mic, COMPLETED: Hourglass } as const;

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const detail = await load(id);

  if (detail === 'not-found' || detail === 'error') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.back}
        </Link>
        <Notice tone="danger" icon={TriangleAlert}>
          {detail === 'not-found' ? t.notFound : t.loadError}
        </Notice>
      </div>
    );
  }

  const report = detail.report?.data ?? null;
  const quoted = new Set(report?.criteria.flatMap((c) => c.evidence.map((e) => e.seq)));
  const durationMs =
    detail.startedAt && detail.endedAt
      ? new Date(detail.endedAt).getTime() - new Date(detail.startedAt).getTime()
      : null;
  const finished = ['COMPLETED', 'EVALUATED', 'FAILED'].includes(detail.status);
  const deleted = detail.dataDeletedAt !== null;
  const waiting = !report && !deleted && detail.status in waitingIcons;
  const WaitingIcon = waiting ? waitingIcons[detail.status as keyof typeof waitingIcons] : Mic;

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:max-w-none print:space-y-5">
      <div className="print-hidden">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.back}
        </Link>
      </div>

      {/* Print-only letterhead */}
      <div className="hidden items-center justify-between border-b pb-3 print:flex">
        <Logo />
        <span className="text-xs text-muted-foreground">
          {t.printedAt(formatDateTime(new Date().toISOString()))}
        </span>
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={detail.status} deleted={deleted} className="print-hidden" />
          </div>
          <h1
            className={cn(
              'text-2xl font-semibold tracking-tight break-words sm:text-3xl',
              deleted && 'text-muted-foreground italic',
            )}
          >
            {detail.candidateName}
          </h1>
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">{t.role}:</dt>
              <dd>{detail.roleName}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">{t.targetLevel}:</dt>
              <dd className="font-mono">{detail.targetLevel}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">
                {detail.startedAt ? t.conversationDate : t.created}:
              </dt>
              <dd>{formatDateTime(detail.startedAt ?? detail.createdAt)}</dd>
            </div>
            {durationMs !== null && (
              <div className="flex gap-1.5">
                <dt className="text-muted-foreground">{t.duration}:</dt>
                <dd className="tabular">{formatClock(durationMs)}</dd>
              </div>
            )}
          </dl>
        </div>
        <ReportActions
          assessmentId={detail.id}
          canRerun={finished && !deleted}
          canPrint={report !== null}
          canDelete={!deleted}
        />
      </header>

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

      {waiting && (
        <div className="flex items-center gap-4 rounded-2xl border border-dashed bg-card/60 p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <WaitingIcon
              className={cn('size-5', detail.status === 'COMPLETED' && 'animate-pulse')}
              aria-hidden
            />
          </span>
          <p className="text-sm text-muted-foreground">
            {t.waiting[detail.status as keyof typeof t.waiting]}
          </p>
        </div>
      )}

      {report && <Verdict report={report} />}

      {report?.language.nonEnglishDetected && (
        <Notice tone="warning" icon={Languages} title={t.languageTitle}>
          {report.language.notes}
        </Notice>
      )}

      {report?.cefr && (
        <Section title={t.cefrTitle}>
          <div className="grid gap-4 sm:grid-cols-2">
            <CefrCard label={t.speaking} target={detail.targetLevel} {...report.cefr.speaking} />
            <CefrCard label={t.listening} target={detail.targetLevel} {...report.cefr.listening} />
          </div>
        </Section>
      )}

      {report && report.criteria.length > 0 && (
        <Section title={t.criteriaTitle}>
          <CriteriaList criteria={report.criteria} />
        </Section>
      )}

      {(detail.recordings.length > 0 || finished) && !deleted && (
        <Section title={t.recordingTitle} className="print-hidden">
          {detail.recordings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noRecording}</p>
          ) : (
            <div className="space-y-3">
              {detail.recordings.map((recording, index) => (
                <div key={recording.id} className="space-y-1">
                  {detail.recordings.length > 1 && (
                    <p className="text-xs text-muted-foreground">{t.recordingPart(index + 1)}</p>
                  )}
                  <audio
                    controls
                    preload="metadata"
                    className="w-full"
                    src={`/admin/assessments/${encodeURIComponent(detail.id)}/recordings/${encodeURIComponent(recording.id)}`}
                  />
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {(detail.turns.length > 0 || (finished && !deleted)) && (
        <Section title={t.transcriptTitle} className="print:break-before-page">
          <Transcript detail={detail} quoted={quoted} />
        </Section>
      )}

      {detail.report && report && (
        <Section title={t.metaTitle} className="print-avoid-break">
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {[
              [t.meta.model, `${detail.report.provider} / ${detail.report.model}`],
              [t.meta.promptVersion, detail.report.promptVersion],
              [t.meta.evaluatedAt, formatDateTime(detail.report.createdAt)],
              [t.meta.conversationLength, t.minutes(report.stats.conversationMs)],
              [t.meta.candidateSpeech, t.minutes(report.stats.candidateSpeechMs)],
              [t.meta.candidateTurns, String(report.stats.candidateTurns)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-dashed pb-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
    </div>
  );
}

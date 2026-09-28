import {
  AdminAssessmentDetailSchema,
  type AdminAssessmentDetail,
  type CriterionResult,
  type Report,
} from '@clientready/shared';
import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { pl } from '@/i18n/pl';
import { adminFetch, isAdmin, logOut } from '@/lib/admin/session';

export const metadata: Metadata = {
  title: `${pl.appName} — ${pl.report.title}`,
  robots: { index: false, follow: false },
};

const t = pl.report;

function clock(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function formatDate(iso: string | null): string {
  return iso
    ? new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(iso),
      )
    : '—';
}

async function load(id: string): Promise<AdminAssessmentDetail | 'not-found' | 'error'> {
  try {
    const res = await adminFetch(`/assessments/${encodeURIComponent(id)}`);
    if (res.status === 404) return 'not-found';
    if (!res.ok) return 'error';
    return AdminAssessmentDetailSchema.parse(await res.json());
  } catch {
    return 'error';
  }
}

async function rerun(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = String(formData.get('id'));
  const res = await adminFetch(`/assessments/${encodeURIComponent(id)}/evaluate`, {
    method: 'POST',
  });
  const path = `/admin/assessments/${encodeURIComponent(id)}`;
  revalidatePath(path);
  redirect(res.ok ? path : `${path}?rerunFailed=1`);
}

async function logout() {
  'use server';
  await logOut();
  redirect('/admin/login');
}

function Recommendation({ report }: { report: Report }) {
  if (report.status === 'INSUFFICIENT_DATA') {
    return (
      <section className="card verdict verdict--insufficient">
        <p className="verdict__label">{t.insufficient}</p>
        <p>{report.insufficientReason}</p>
      </section>
    );
  }
  const recommendation = report.recommendation ?? 'READY_WITH_CONCERNS';
  return (
    <section className={`card verdict verdict--${recommendation.toLowerCase()}`}>
      <p className="verdict__label">{t.recommendation[recommendation]}</p>
      <p>{report.summary}</p>
      {report.modelRecommendation && report.modelRecommendation !== report.recommendation && (
        <p className="muted small">
          {t.modelDisagrees(t.recommendation[report.modelRecommendation])}
        </p>
      )}
      <p className="muted small">{t.humanDecision}</p>
    </section>
  );
}

function Criterion({ criterion }: { criterion: CriterionResult }) {
  return (
    <article className="criterion">
      <header>
        <h3>{criterion.name}</h3>
        <span className={`score score--${criterion.score}`} aria-label={`${criterion.score}/5`}>
          {criterion.score}/5
        </span>
      </header>
      <p>{criterion.comment}</p>
      {criterion.evidence.length > 0 ? (
        <ul className="quotes" aria-label={t.evidence}>
          {criterion.evidence.map((e) => (
            <li key={`${e.seq}-${e.quote}`}>
              <q>{e.quote}</q>{' '}
              <a href={`#turn-${e.seq}`} className="small">
                {t.goToTurn}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="error small">{t.noEvidence}</p>
      )}
      {criterion.rejectedQuotes > 0 && (
        <p className="muted small">{t.rejectedQuotes(criterion.rejectedQuotes)}</p>
      )}
    </article>
  );
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rerunFailed?: string }>;
}) {
  const { id } = await params;
  const { rerunFailed } = await searchParams;
  if (!(await isAdmin())) {
    redirect(`/admin/login?next=${encodeURIComponent(`/admin/assessments/${id}`)}`);
  }

  const data = await load(id);
  if (data === 'not-found' || data === 'error') {
    return (
      <main lang="pl" className="legacy wide">
        <p className="brand">{pl.appName}</p>
        <section className="card">
          <p className="error">{data === 'not-found' ? t.notFound : t.apiError}</p>
        </section>
      </main>
    );
  }

  const report = data.report?.data;
  const quotedTurns = new Set(report?.criteria.flatMap((c) => c.evidence.map((e) => e.seq)));
  const canRerun = ['COMPLETED', 'EVALUATED', 'FAILED'].includes(data.status);

  return (
    <main lang="pl" className="legacy wide">
      <div className="topbar">
        <p className="brand">{pl.appName}</p>
        <form action={logout}>
          <button type="submit" className="link">
            {pl.login.logout}
          </button>
        </form>
      </div>

      <section className="card">
        <p className="muted small">{t.title}</p>
        <h1>{data.candidateName}</h1>
        <dl className="facts">
          <dt>{t.role}</dt>
          <dd>{data.roleName}</dd>
          <dt>{t.targetLevel}</dt>
          <dd>{data.targetLevel}</dd>
          <dt>{t.conversation}</dt>
          <dd>{formatDate(data.startedAt)}</dd>
          <dt>Status</dt>
          <dd>{t.status[data.status]}</dd>
        </dl>
        {data.status === 'FAILED' && data.evaluationError && (
          <p className="error small">
            {t.evaluationError}: {data.evaluationError}
          </p>
        )}
      </section>

      {report && <Recommendation report={report} />}

      {report?.language.nonEnglishDetected && (
        <section className="card notice">
          <h2>{t.languageTitle}</h2>
          <p>{report.language.notes}</p>
        </section>
      )}

      {report?.cefr && (
        <section className="card">
          <h2>{t.cefrTitle}</h2>
          <div className="cefr">
            {(['speaking', 'listening'] as const).map((skill) => (
              <div key={skill}>
                <p className="muted small">{t[skill]}</p>
                <p className="cefr__level">{report.cefr![skill].level}</p>
                <p className="small">{report.cefr![skill].justification}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {report && report.criteria.length > 0 && (
        <section className="card">
          <h2>{t.criteriaTitle}</h2>
          {report.criteria.map((c) => (
            <Criterion key={c.key} criterion={c} />
          ))}
        </section>
      )}

      <section className="card">
        <h2>{t.recordingTitle}</h2>
        {data.recordings.length === 0 && <p className="muted">{t.noRecording}</p>}
        {data.recordings.map((recording, index) => (
          <div key={recording.id} className="recording">
            {data.recordings.length > 1 && (
              <p className="small muted">{t.recordingPart(index + 1)}</p>
            )}
            <audio
              controls
              preload="metadata"
              src={`/admin/assessments/${encodeURIComponent(data.id)}/recordings/${encodeURIComponent(recording.id)}`}
            />
          </div>
        ))}
      </section>

      <section className="card">
        <h2>{t.transcriptTitle}</h2>
        {data.turns.length === 0 && <p className="muted">{t.noTranscript}</p>}
        <ol className="transcript">
          {data.turns.map((turn) => (
            <li
              key={turn.seq}
              id={`turn-${turn.seq}`}
              className={`turn turn--${turn.speaker.toLowerCase()}${quotedTurns.has(turn.seq) ? ' turn--quoted' : ''}`}
            >
              <span className="turn__meta">
                {clock(turn.startedAtMs)} ·{' '}
                {turn.speaker === 'AI' ? t.speakerAi : t.speakerCandidate}
              </span>
              <p>{turn.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2>{t.metaTitle}</h2>
        {data.report && report && (
          <dl className="facts">
            <dt>{t.meta.model}</dt>
            <dd>
              {data.report.provider} / {data.report.model}
            </dd>
            <dt>{t.meta.promptVersion}</dt>
            <dd>{data.report.promptVersion}</dd>
            <dt>{t.meta.evaluatedAt}</dt>
            <dd>{formatDate(data.report.createdAt)}</dd>
            <dt>{t.meta.conversationLength}</dt>
            <dd>{t.minutes(report.stats.conversationMs)}</dd>
            <dt>{t.meta.candidateSpeech}</dt>
            <dd>{t.minutes(report.stats.candidateSpeechMs)}</dd>
            <dt>{t.meta.candidateTurns}</dt>
            <dd>{report.stats.candidateTurns}</dd>
          </dl>
        )}
        {canRerun && (
          <form action={rerun}>
            <input type="hidden" name="id" value={data.id} />
            {rerunFailed && <p className="error small">{t.rerunFailed}</p>}
            <button type="submit" className="secondary">
              {t.rerun}
            </button>
            <p className="muted small">{t.rerunHint}</p>
          </form>
        )}
      </section>
    </main>
  );
}

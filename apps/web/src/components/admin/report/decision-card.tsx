'use client';

import {
  DECISION_COMMENT_MAX,
  DECISION_COMMENT_MIN,
  RecommendationSchema,
  type Recommendation,
  type RecruiterDecision,
} from '@clientready/shared';
import { Check, History, PenLine, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { recordDecisionAction } from '@/app/admin/actions';
import { Notice } from '@/components/common/notice';
import { Spinner } from '@/components/common/spinner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { pl } from '@/i18n/pl';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ReportSection } from './report-section';

const t = pl.report.decision;

/**
 * The recruiter's own verdict on the AI recommendation (human oversight). Agreeing is one
 * click; disagreeing asks for the recruiter's verdict and a short reason.
 */
export function DecisionCard({
  assessmentId,
  aiRecommendation,
  decision,
}: {
  assessmentId: string;
  aiRecommendation: Recommendation;
  decision: RecruiterDecision | null;
}) {
  const current = decision?.forCurrentReport ? decision : null;
  const [editing, setEditing] = useState(current === null);
  const [disagreeing, setDisagreeing] = useState(false);
  const [saving, startSaving] = useTransition();

  const save = (verdict: Recommendation, comment?: string) =>
    startSaving(async () => {
      const result = await recordDecisionAction(assessmentId, { verdict, comment });
      if (!result.ok) {
        toast.error(t.failed);
        return;
      }
      toast.success(t.saved);
      setEditing(false);
      setDisagreeing(false);
    });

  return (
    <ReportSection title={t.title} className={cn('print-avoid-break', !current && 'print-hidden')}>
      {current && !editing ? (
        <CurrentDecision decision={current} onChange={() => setEditing(true)} />
      ) : (
        <div className="space-y-4">
          {decision && !decision.forCurrentReport && (
            <Notice tone="warning" icon={History}>
              {t.outdated}
            </Notice>
          )}
          <p className="text-sm">{t.question(pl.recommendation[aiRecommendation])}</p>
          {disagreeing ? (
            <DisagreeForm
              aiRecommendation={aiRecommendation}
              saving={saving}
              onSave={save}
              onCancel={() => setDisagreeing(false)}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button disabled={saving} onClick={() => save(aiRecommendation)}>
                {saving ? <Spinner className="text-current" /> : <Check aria-hidden />}
                {t.agree}
              </Button>
              <Button variant="outline" disabled={saving} onClick={() => setDisagreeing(true)}>
                <X aria-hidden />
                {t.disagree}
              </Button>
              {current && (
                <Button variant="ghost" disabled={saving} onClick={() => setEditing(false)}>
                  {t.cancel}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </ReportSection>
  );
}

function CurrentDecision({
  decision,
  onChange,
}: {
  decision: RecruiterDecision;
  onChange: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-lg font-semibold">{pl.recommendation[decision.verdict]}</p>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-medium',
            decision.agreesWithAi ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning',
          )}
        >
          {decision.agreesWithAi ? t.agrees : t.differs}
        </span>
      </div>
      {decision.comment && (
        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/85">
          {decision.comment}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {t.by(decision.decidedBy, formatDateTime(decision.decidedAt))}
        </p>
        <Button variant="ghost" size="sm" className="print-hidden" onClick={onChange}>
          <PenLine aria-hidden />
          {t.change}
        </Button>
      </div>
    </div>
  );
}

function DisagreeForm({
  aiRecommendation,
  saving,
  onSave,
  onCancel,
}: {
  aiRecommendation: Recommendation;
  saving: boolean;
  onSave: (verdict: Recommendation, comment: string) => void;
  onCancel: () => void;
}) {
  const options = RecommendationSchema.options.filter((option) => option !== aiRecommendation);
  const [verdict, setVerdict] = useState<Recommendation>(options[0]!);
  const [comment, setComment] = useState('');
  const [showError, setShowError] = useState(false);
  const valid = comment.trim().length >= DECISION_COMMENT_MIN;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) {
          setShowError(true);
          return;
        }
        onSave(verdict, comment.trim());
      }}
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t.ownVerdict}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-xl border bg-card p-3 text-sm transition-colors hover:border-brand/40 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
            >
              <input
                type="radio"
                name="verdict"
                value={option}
                checked={verdict === option}
                onChange={() => setVerdict(option)}
                className="accent-[var(--brand)]"
              />
              {pl.recommendation[option]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="decision-comment">{t.comment}</Label>
        <Textarea
          id="decision-comment"
          value={comment}
          maxLength={DECISION_COMMENT_MAX}
          rows={3}
          aria-invalid={showError && !valid}
          aria-describedby="decision-comment-hint"
          onChange={(event) => setComment(event.target.value)}
        />
        <p
          id="decision-comment-hint"
          className={cn('text-sm', showError && !valid ? 'text-danger' : 'text-muted-foreground')}
        >
          {showError && !valid ? t.commentRequired : t.commentHint}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? <Spinner className="text-current" /> : <Check aria-hidden />}
          {t.save}
        </Button>
        <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}

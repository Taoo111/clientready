'use client';

import type { PublicAssessmentView } from '@clientready/shared';
import { useState } from 'react';
import { en } from '@/i18n/en';

export function ConsentStep({
  view,
  onAccept,
}: {
  view: PublicAssessmentView;
  onAccept: () => Promise<void>;
}) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const t = en.consent;

  return (
    <section className="card">
      <h1>{t.title(view.candidateName.split(' ')[0] ?? view.candidateName)}</h1>
      <p>{t.intro(view.roleName)}</p>
      <ul className="points">
        {t.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <h2>{t.tipsTitle}</h2>
      <ul>
        {t.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>

      <label className="checkbox">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>{t.checkbox}</span>
      </label>

      <button
        type="button"
        disabled={!checked || submitting}
        onClick={async () => {
          setSubmitting(true);
          await onAccept();
          setSubmitting(false);
        }}
      >
        {t.continue}
      </button>
    </section>
  );
}

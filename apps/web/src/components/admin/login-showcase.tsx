import { pl } from '@/i18n/pl';

const t = pl.login.showcase;

/**
 * The right half of the login screen on wide screens: what ClientReady does, shown as a
 * small preview of the product (a call, a highlighted quote, a verdict) on an ink panel.
 * Deliberately not a stock photo: it explains the product and stays on-brand. Example data.
 */
export function LoginShowcase() {
  return (
    <aside
      aria-label={t.label}
      className="relative hidden overflow-hidden bg-ink text-ink-foreground lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16"
    >
      {/* Faint dot grid, like squared paper. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(color-mix(in oklch, var(--ink-foreground) 16%, transparent) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      <div className="relative max-w-md space-y-4">
        <p className="font-mono text-xs tracking-wide text-ink-foreground/60 uppercase">
          {t.eyebrow}
        </p>
        <h2 className="text-3xl leading-tight font-semibold tracking-tight text-balance xl:text-4xl">
          {t.title}
        </h2>
        <p className="text-pretty text-ink-foreground/75">{t.body}</p>
      </div>

      <div className="relative my-10 w-full max-w-md space-y-3" aria-hidden>
        <p className="font-mono text-[0.7rem] tracking-wide text-ink-foreground/50 uppercase">
          {t.example}
        </p>
        {/* The call */}
        <div className="flex items-center gap-3 rounded-lg bg-card p-4 text-foreground shadow-raised">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-strong text-sm font-semibold text-brand-foreground">
            EV
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t.call}</p>
            <p className="font-mono text-xs text-muted-foreground">{t.callFacts}</p>
          </div>
        </div>
        {/* A quote from the transcript, highlighted as evidence */}
        <div className="ml-8 rounded-lg bg-card p-4 text-sm leading-relaxed text-foreground shadow-raised">
          <p className="mb-1 font-mono text-xs text-muted-foreground">{t.quoteMeta}</p>
          <p>
            {t.quoteBefore}
            <mark className="rounded-[2px] bg-marker px-0.5 text-foreground">{t.quoteMarked}</mark>
            {t.quoteAfter}
          </p>
        </div>
        {/* The recommendation, for a human to decide on */}
        <div className="rounded-lg bg-card p-4 text-foreground shadow-raised">
          <p className="flex items-center gap-2 font-semibold">
            <span className="size-2.5 rounded-full bg-warning" />
            {t.verdict}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{t.verdictFacts}</p>
        </div>
      </div>

      <ul className="relative grid max-w-md grid-cols-3 gap-6 border-t border-ink-foreground/15 pt-6 text-sm">
        {t.facts.map((fact) => (
          <li key={fact.value} className="space-y-1">
            <p className="font-mono text-lg font-medium">{fact.value}</p>
            <p className="text-ink-foreground/65">{fact.label}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}

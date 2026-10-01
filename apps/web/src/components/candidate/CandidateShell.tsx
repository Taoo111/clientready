import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { CustomerBrand } from '@/components/brand/customer-brand';
import { Logo } from '@/components/brand/logo';
import { brand } from '@/lib/brand';
import { en } from '@/i18n/en';
import { cn } from '@/lib/utils';

/** Calm, single-column frame for every candidate screen. */
export function CandidateShell({ step, children }: { step?: number; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between gap-4 px-4 pt-6 sm:pt-10">
        {brand.customerName || brand.customerLogoUrl ? <CustomerBrand /> : <Logo />}
        {step !== undefined && <Stepper current={step} />}
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6 sm:py-10">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-xl px-4 pb-6 text-center text-xs text-muted-foreground">
        {en.footer}
        {(brand.customerName || brand.customerLogoUrl) && (
          <span className="mt-2 flex items-center justify-center gap-1.5">
            {en.poweredBy} <Logo className="scale-75" />
          </span>
        )}
      </footer>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Progress">
      {en.steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
                done && 'bg-brand text-brand-foreground',
                active && 'bg-brand-soft text-brand ring-1 ring-brand/30',
                !done && !active && 'bg-muted text-muted-foreground',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
              <span className="sr-only">{label}</span>
            </span>
            {index < en.steps.length - 1 && (
              <span
                className={cn('h-px w-4 sm:w-6', done ? 'bg-brand' : 'bg-border')}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Card for a single task on a candidate screen. */
export function CandidateCard({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      aria-live="polite"
      className={cn('rounded-3xl border bg-card p-6 shadow-card sm:p-8', className)}
      {...props}
    />
  );
}

const tones = {
  brand: 'bg-brand-soft text-brand',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-muted text-muted-foreground',
} as const;

/** Full-screen message with an icon: errors, expired links, end of the conversation. */
export function StatusScreen({
  icon: Icon,
  tone = 'neutral',
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  tone?: keyof typeof tones;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <CandidateCard className="flex flex-col items-center gap-4 text-center">
      <span className={cn('flex size-14 items-center justify-center rounded-full', tones[tone])}>
        <Icon className="size-7" aria-hidden />
      </span>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-balance">{title}</h1>
        {body && <p className="text-pretty text-muted-foreground">{body}</p>}
      </div>
      {children}
    </CandidateCard>
  );
}

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
        {step !== undefined && <StepLabel current={step} />}
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

/** "Step 2 of 3 · Microphone": plain text instead of numbered circles. */
function StepLabel({ current }: { current: number }) {
  return (
    <p className="font-mono text-xs text-muted-foreground">
      {en.stepOf(current + 1, en.steps.length)}
      <span aria-hidden> · </span>
      <span className="text-foreground">{en.steps[current]}</span>
    </p>
  );
}

/** Card for a single task on a candidate screen. */
export function CandidateCard({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      aria-live="polite"
      className={cn('rounded-xl border bg-card p-6 shadow-card sm:p-8', className)}
      {...props}
    />
  );
}

const tones = {
  brand: 'text-brand',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-muted-foreground',
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
      <Icon className={cn('size-9', tones[tone])} strokeWidth={1.75} aria-hidden />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {body && <p className="text-pretty text-foreground/80">{body}</p>}
      </div>
      {children}
    </CandidateCard>
  );
}

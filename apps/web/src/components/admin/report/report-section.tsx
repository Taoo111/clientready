import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A titled part of the report. Separated by typography and a hairline, not by a card - only
 * the parts the recruiter acts on (verdict, decision) are boxed (`card`).
 */
export function ReportSection({
  title,
  children,
  className,
  action,
  card = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  card?: boolean;
}) {
  return (
    <section
      className={cn(
        card
          ? 'rounded-xl border bg-card p-5 shadow-card sm:p-6 print:border-0 print:p-0 print:shadow-none'
          : 'border-t pt-6',
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

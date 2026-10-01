import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** A titled card on the report page; flattens to plain content when printed. */
export function ReportSection({
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

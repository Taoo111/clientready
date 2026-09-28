import { cn } from '@/lib/utils';

/** Brand mark: a speech bubble with a check — "ready for the client conversation". */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-7 shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        d="M8 4h16a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5h-9.2l-5.6 4.6c-.8.66-2.2.1-2.2-1V24A5 5 0 0 1 3 19V9a5 5 0 0 1 5-5Z"
        fill="var(--brand)"
      />
      <path
        d="m10.5 14.2 3.6 3.6 7.4-7.4"
        fill="none"
        stroke="var(--brand-foreground)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-foreground', className)}>
      <LogoMark />
      {!compact && (
        <span className="text-[1.05rem] font-semibold tracking-tight">
          Client<span className="text-brand">Ready</span>
        </span>
      )}
      {compact && <span className="sr-only">ClientReady</span>}
    </span>
  );
}

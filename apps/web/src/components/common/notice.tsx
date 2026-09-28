import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const tones = {
  info: 'border-info/20 bg-info-soft text-foreground [&_[data-icon]]:text-info',
  success: 'border-success/20 bg-success-soft text-foreground [&_[data-icon]]:text-success',
  warning: 'border-warning/25 bg-warning-soft text-foreground [&_[data-icon]]:text-warning',
  danger: 'border-danger/20 bg-danger-soft text-foreground [&_[data-icon]]:text-danger',
  neutral: 'border-border bg-muted text-foreground [&_[data-icon]]:text-muted-foreground',
} as const;

/** Inline message with icon, used for errors, warnings and hints. */
export function Notice({
  tone = 'neutral',
  icon: Icon,
  title,
  children,
  className,
}: {
  tone?: keyof typeof tones;
  icon?: LucideIcon;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={cn('flex gap-3 rounded-xl border p-4 text-sm', tones[tone], className)}
    >
      {Icon && <Icon data-icon className="mt-0.5 size-5 shrink-0" aria-hidden />}
      <div className="space-y-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-foreground/80">{children}</div>}
      </div>
    </div>
  );
}

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { pl } from '@/i18n/pl';

/** "Back to the list" link at the top of panel sub-pages. */
export function BackLink() {
  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {pl.report.back}
    </Link>
  );
}

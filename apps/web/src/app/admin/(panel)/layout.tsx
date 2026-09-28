import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PanelHeader } from '@/components/admin/panel-header';
import { pl } from '@/i18n/pl';
import { requireRecruiter } from '@/lib/admin/session';

export const metadata: Metadata = {
  title: { default: pl.appName, template: `%s — ${pl.appName}` },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const recruiter = await requireRecruiter();
  return (
    <div lang="pl" className="min-h-dvh">
      <PanelHeader email={recruiter.email} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

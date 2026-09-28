import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PanelHeader } from '@/components/admin/panel-header';
import { WakeScreen } from '@/components/admin/wake-screen';
import { pl } from '@/i18n/pl';
import { ApiUnavailableError, requireRecruiter } from '@/lib/admin/session';

export const metadata: Metadata = {
  title: { default: pl.appName, template: `%s — ${pl.appName}` },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: ReactNode }) {
  let recruiter;
  try {
    recruiter = await requireRecruiter();
  } catch (error) {
    // The API is asleep (free hosting) or restarting: wait for it instead of failing.
    if (error instanceof ApiUnavailableError) return <WakeScreen />;
    throw error;
  }
  return (
    <div lang="pl" className="min-h-dvh">
      <PanelHeader email={recruiter.email} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

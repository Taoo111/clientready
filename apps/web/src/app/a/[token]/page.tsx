import type { Metadata } from 'next';
import { CandidateFlow } from '@/components/candidate/CandidateFlow';
import { en } from '@/i18n/en';

export const metadata: Metadata = {
  title: `${en.appName} - English conversation`,
  // Candidate links are private.
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function CandidatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CandidateFlow token={token} />;
}

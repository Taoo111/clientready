import { Spinner } from '@/components/common/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { en } from '@/i18n/en';
import { CandidateCard } from './candidate-shell';

/** Skeleton while the assessment loads; explains the wait while the API wakes up. */
export function LoadingCard({ waking }: { waking: boolean }) {
  return (
    <CandidateCard className="space-y-4" aria-busy="true">
      {waking && (
        <div className="flex items-start gap-3 rounded-2xl bg-brand-soft/70 p-4 text-sm">
          <Spinner className="mt-0.5 text-brand" />
          <div className="space-y-0.5">
            <p className="font-medium">{en.preparing.title}</p>
            <p className="text-muted-foreground">{en.preparing.body}</p>
          </div>
        </div>
      )}
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="space-y-3 pt-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-11 w-full rounded-lg" />
    </CandidateCard>
  );
}

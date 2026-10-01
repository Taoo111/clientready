import { CircleCheck, CloudAlert, CloudCheck } from 'lucide-react';
import { Spinner } from '@/components/common/spinner';
import { en } from '@/i18n/en';
import type { UploadStatus } from '@/lib/realtime/conversation-controller';
import { cn } from '@/lib/utils';
import { StatusScreen } from './candidate-shell';

export function EndedStep({ timeUp, upload }: { timeUp: boolean; upload: UploadStatus }) {
  const t = en.ended;
  return (
    <StatusScreen icon={CircleCheck} tone="success" title={t.title} body={t.body}>
      {timeUp && <p className="text-sm text-muted-foreground">{t.timeUp}</p>}
      <div
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm',
          upload === 'failed'
            ? 'bg-warning-soft text-foreground'
            : 'bg-muted text-muted-foreground',
        )}
        aria-live="polite"
      >
        {upload === 'uploading' && <Spinner />}
        {upload === 'failed' && <CloudAlert className="size-4 text-warning" aria-hidden />}
        {(upload === 'done' || upload === 'idle') && (
          <CloudCheck className="size-4 text-success" aria-hidden />
        )}
        <span>
          {upload === 'uploading' ? t.uploading : upload === 'failed' ? t.uploadFailed : t.uploaded}
        </span>
      </div>
    </StatusScreen>
  );
}

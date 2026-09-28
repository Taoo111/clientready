import { en } from '@/i18n/en';
import type { UploadStatus } from '@/lib/realtime/conversation-controller';

export function EndedStep({ timeUp, upload }: { timeUp: boolean; upload: UploadStatus }) {
  const t = en.ended;
  const uploadMessage =
    upload === 'uploading' ? t.uploading : upload === 'failed' ? t.uploadFailed : t.uploaded;
  return (
    <section className="card" aria-live="polite">
      <h1>{t.title}</h1>
      {timeUp && <p>{t.timeUp}</p>}
      <p>{t.body}</p>
      <p className={upload === 'failed' ? 'error' : 'muted'}>{uploadMessage}</p>
    </section>
  );
}

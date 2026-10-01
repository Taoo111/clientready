import type { AdminAssessmentDetail } from '@clientready/shared';
import { pl } from '@/i18n/pl';

const t = pl.report;

/** Audio players, one per connection segment. */
export function Recordings({
  assessmentId,
  recordings,
}: {
  assessmentId: string;
  recordings: AdminAssessmentDetail['recordings'];
}) {
  if (recordings.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.noRecording}</p>;
  }
  return (
    <div className="space-y-3">
      {recordings.map((recording, index) => (
        <div key={recording.id} className="space-y-1">
          {recordings.length > 1 && (
            <p className="text-xs text-muted-foreground">{t.recordingPart(index + 1)}</p>
          )}
          <audio
            controls
            preload="metadata"
            className="w-full"
            src={
              // Cloud storage: short-lived signed URL; local disk: streamed via this app.
              recording.playbackUrl ??
              `/admin/assessments/${encodeURIComponent(assessmentId)}/recordings/${encodeURIComponent(recording.id)}`
            }
          />
        </div>
      ))}
    </div>
  );
}

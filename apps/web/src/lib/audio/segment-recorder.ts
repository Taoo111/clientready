import { reportProblem } from '../monitoring';
import { ConversationRecorder } from './recorder';

const UPLOAD_RETRIES = 3;

/**
 * Records the conversation one connection segment at a time (a reconnect starts a new
 * segment) and uploads each finished segment in the background, with retries.
 */
export class SegmentRecorder {
  private current: ConversationRecorder | undefined;
  private readonly uploads: Promise<boolean>[] = [];

  constructor(
    private readonly context: AudioContext | undefined,
    private readonly mic: MediaStream,
    private readonly upload: (blob: Blob, durationMs: number) => Promise<unknown>,
  ) {}

  startSegment(): void {
    const recorder = new ConversationRecorder(this.context, this.mic);
    this.current = recorder;
    try {
      recorder.start();
    } catch (error) {
      console.warn('[recording] could not start', error);
      reportProblem('recording', error, 'warning');
    }
  }

  /** Mixes the AI's voice into the current segment. */
  addRemote(stream: MediaStream): void {
    this.current?.addRemote(stream);
  }

  /** Stops the current segment (if any) and starts uploading it. */
  stopSegment(): void {
    const recorder = this.current;
    this.current = undefined;
    if (!recorder) return;
    this.uploads.push(
      recorder
        .stop()
        .then((result) => (result ? this.uploadWithRetry(result.blob, result.durationMs) : true))
        .catch(() => false),
    );
  }

  get hasUploads(): boolean {
    return this.uploads.length > 0;
  }

  /** Resolves when every segment upload has finished; true if all succeeded. */
  async allUploaded(): Promise<boolean> {
    const results = await Promise.all(this.uploads);
    return results.every(Boolean);
  }

  private async uploadWithRetry(blob: Blob, durationMs: number): Promise<boolean> {
    let lastError: unknown;
    for (let attempt = 0; attempt < UPLOAD_RETRIES; attempt++) {
      try {
        await this.upload(blob, durationMs);
        return true;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 2_000 * (attempt + 1)));
      }
    }
    reportProblem('recording', lastError);
    return false;
  }
}

const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

export interface RecordingResult {
  blob: Blob;
  durationMs: number;
  /** True when the AI voice is part of the recording. */
  mixed: boolean;
}

/**
 * Records one connection segment of the conversation. The candidate's microphone and the
 * AI's remote audio are mixed into one track via Web Audio; if mixing is not possible
 * only the microphone is recorded.
 */
export class ConversationRecorder {
  private recorder: MediaRecorder | undefined;
  private readonly chunks: Blob[] = [];
  private destination: MediaStreamAudioDestinationNode | undefined;
  private readonly sources: MediaStreamAudioSourceNode[] = [];
  private startedAt = 0;
  private mixed = false;

  constructor(
    private readonly context: AudioContext | undefined,
    private readonly mic: MediaStream,
  ) {}

  start(): void {
    const mimeType = pickMimeType();
    if (typeof MediaRecorder === 'undefined') return;

    let stream = this.mic;
    if (this.context) {
      try {
        this.destination = this.context.createMediaStreamDestination();
        this.connect(this.mic);
        stream = this.destination.stream;
      } catch {
        this.destination = undefined;
      }
    }

    this.recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.recorder.start(1000);
    this.startedAt = performance.now();
  }

  /** Adds the AI's remote audio to the mix (no-op when recording the mic only). */
  addRemote(stream: MediaStream): void {
    if (!this.destination) return;
    try {
      this.connect(stream);
      this.mixed = true;
    } catch {
      // Keep recording the microphone only.
    }
  }

  private connect(stream: MediaStream): void {
    if (!this.context || !this.destination) return;
    const source = this.context.createMediaStreamSource(stream);
    source.connect(this.destination);
    this.sources.push(source);
  }

  /** Stops recording and returns the audio, or undefined if nothing was recorded. */
  stop(): Promise<RecordingResult | undefined> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === 'inactive') return Promise.resolve(undefined);
    const durationMs = performance.now() - this.startedAt;

    return new Promise((resolve) => {
      recorder.onstop = () => {
        for (const source of this.sources) source.disconnect();
        const type = recorder.mimeType || this.chunks[0]?.type || 'audio/webm';
        const blob = new Blob(this.chunks, { type });
        resolve(blob.size > 0 ? { blob, durationMs, mixed: this.mixed } : undefined);
      };
      recorder.stop();
    });
  }
}

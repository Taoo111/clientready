import { LevelMeter } from './level-meter';

/**
 * The audio side of a call: one AudioContext, the candidate's microphone level, playback of
 * the client's voice and its level. Must be created from a user gesture (AudioContext).
 */
export class CallAudio {
  /** Undefined when the browser refuses an AudioContext (levels then read 0). */
  readonly context: AudioContext | undefined;
  private readonly micMeter: LevelMeter | undefined;
  private aiMeter: LevelMeter | undefined;
  private readonly remoteAudio: HTMLAudioElement;

  constructor(mic: MediaStream) {
    let context: AudioContext | undefined;
    try {
      context = new AudioContext();
      void context.resume();
      this.micMeter = new LevelMeter(context, mic);
    } catch {
      context = undefined;
    }
    this.context = context;
    this.remoteAudio = new Audio();
    this.remoteAudio.autoplay = true;
  }

  micLevel(): number {
    return this.micMeter?.level() ?? 0;
  }

  aiLevel(): number {
    return this.aiMeter?.level() ?? 0;
  }

  /** Plays the client's voice (a new connection brings a new stream) and measures it. */
  playRemote(stream: MediaStream): void {
    this.remoteAudio.srcObject = stream;
    void this.remoteAudio.play().catch(() => undefined);
    this.aiMeter?.dispose();
    this.aiMeter = this.context ? new LevelMeter(this.context, stream) : undefined;
  }

  /** Stops measuring the client's voice (the connection segment ended). */
  stopRemote(): void {
    this.aiMeter?.dispose();
    this.aiMeter = undefined;
  }

  dispose(): void {
    this.micMeter?.dispose();
    this.stopRemote();
    this.remoteAudio.srcObject = null;
    void this.context?.close().catch(() => undefined);
  }
}

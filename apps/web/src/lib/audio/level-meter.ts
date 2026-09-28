/** Reads a 0..1 loudness level from a media stream (RMS of the waveform, scaled for display). */
export class LevelMeter {
  private readonly analyser: AnalyserNode;
  private readonly source: MediaStreamAudioSourceNode;
  private readonly buffer: Float32Array<ArrayBuffer>;

  constructor(context: AudioContext, stream: MediaStream) {
    this.source = context.createMediaStreamSource(stream);
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.buffer = new Float32Array(this.analyser.fftSize);
    this.source.connect(this.analyser);
  }

  level(): number {
    this.analyser.getFloatTimeDomainData(this.buffer);
    let sum = 0;
    for (const sample of this.buffer) sum += sample * sample;
    const rms = Math.sqrt(sum / this.buffer.length);
    // Speech RMS is typically 0.01–0.2; stretch it for a readable meter.
    return Math.min(1, rms * 6);
  }

  dispose(): void {
    this.source.disconnect();
    this.analyser.disconnect();
  }
}

/** Level above which we consider someone to be speaking. */
export const SPEAKING_THRESHOLD = 0.08;

import { SESSION_HARD_LIMIT_MS, type RealtimeSessionResult } from '@clientready/shared';
import { LevelMeter } from '../audio/level-meter';
import { ConversationRecorder } from '../audio/recorder';
import { ApiError, candidateApi } from '../candidate-api';
import { RealtimeConnection } from './connection';
import { TranscriptUploader } from './transcript-uploader';

export type ConversationPhase = 'connecting' | 'live' | 'dropped' | 'finishing' | 'ended';
export type ConversationError = 'tooManyConnections' | 'unavailable' | 'connectFailed';
export type UploadStatus = 'idle' | 'uploading' | 'done' | 'failed';

export interface ConversationState {
  phase: ConversationPhase;
  /** Set while `dropped` when reconnecting is not possible or failed. */
  error?: ConversationError;
  /** Reconnecting makes sense (false e.g. after too many connections). */
  canReconnect: boolean;
  remainingMs: number;
  micLevel: number;
  aiLevel: number;
  endReason?: 'candidate' | 'timeUp';
  upload: UploadStatus;
}

const TICK_MS = 100;
const UPLOAD_RETRIES = 3;

/**
 * Runs the live conversation: realtime connection(s), timer and hard stop, transcript
 * upload, recording per connection segment, reconnects and the final `end` call.
 * Must be constructed from a user gesture (it creates the AudioContext).
 */
export class ConversationController {
  private state: ConversationState = {
    phase: 'connecting',
    canReconnect: true,
    remainingMs: SESSION_HARD_LIMIT_MS,
    micLevel: 0,
    aiLevel: 0,
    upload: 'idle',
  };
  private readonly context: AudioContext | undefined;
  private readonly micMeter: LevelMeter | undefined;
  private aiMeter: LevelMeter | undefined;
  private readonly remoteAudio: HTMLAudioElement;
  private readonly uploader: TranscriptUploader;
  private connection: RealtimeConnection | undefined;
  private recorder: ConversationRecorder | undefined;
  private readonly recordingUploads: Promise<boolean>[] = [];
  private sessionStartEpochMs: number | undefined;
  private readonly ticker: ReturnType<typeof setInterval>;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly token: string,
    private readonly mic: MediaStream,
  ) {
    try {
      this.context = new AudioContext();
      void this.context.resume();
      this.micMeter = new LevelMeter(this.context, mic);
    } catch {
      this.context = undefined;
    }
    this.remoteAudio = new Audio();
    this.remoteAudio.autoplay = true;
    this.uploader = new TranscriptUploader(token);
    this.ticker = setInterval(() => this.tick(), TICK_MS);
  }

  /** For useSyncExternalStore. */
  readonly getState = (): ConversationState => this.state;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private update(patch: Partial<ConversationState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  private tick(): void {
    const patch: Partial<ConversationState> = {
      micLevel: this.micMeter?.level() ?? 0,
      aiLevel: this.aiMeter?.level() ?? 0,
    };
    if (this.sessionStartEpochMs !== undefined) {
      patch.remainingMs = Math.max(
        0,
        SESSION_HARD_LIMIT_MS - (Date.now() - this.sessionStartEpochMs),
      );
    }
    this.update(patch);
    const active = ['connecting', 'live', 'dropped'].includes(this.state.phase);
    if (active && this.sessionStartEpochMs !== undefined && this.state.remainingMs <= 0) {
      void this.finish('timeUp');
    }
  }

  /** Starts (or resumes) the conversation. */
  async connect(): Promise<void> {
    if (this.state.phase !== 'connecting' && this.state.phase !== 'dropped') return;
    this.update({ phase: 'connecting', error: undefined });

    // Everything said before a drop must be stored before the server builds the resume prompt.
    await this.uploader.flush();

    let session: RealtimeSessionResult;
    try {
      session = await candidateApi.realtimeSession(this.token);
    } catch (error) {
      this.handleSessionError(error);
      return;
    }

    this.sessionStartEpochMs = Date.now() - session.elapsedMs;
    this.uploader.syncNextSeq(session.nextSeq);

    const recorder = new ConversationRecorder(this.context, this.mic);
    this.recorder = recorder;
    try {
      recorder.start();
    } catch (error) {
      console.warn('[conversation] recording could not start', error);
    }

    const connection = new RealtimeConnection({
      clientSecret: session.clientSecret,
      mic: this.mic,
      timeCues: session.timeCues,
      sessionStartEpochMs: this.sessionStartEpochMs,
      onRemoteStream: (stream) => this.attachRemote(stream, recorder),
      onTurn: (turn) =>
        this.uploader.add(
          turn.speaker,
          turn.text,
          turn.startedAtEpochMs - (this.sessionStartEpochMs ?? turn.startedAtEpochMs),
        ),
      onDrop: (reason) => this.handleDrop(reason),
    });
    this.connection = connection;

    try {
      await connection.connect();
    } catch (error) {
      console.warn('[conversation] connect failed', error);
      connection.close();
      if (this.state.phase !== 'connecting') return;
      this.stopSegment();
      this.update({ phase: 'dropped', error: 'connectFailed', canReconnect: true });
      return;
    }
    if (this.state.phase === 'connecting') this.update({ phase: 'live' });
  }

  /** The candidate chose to end the conversation. */
  endByCandidate(): Promise<void> {
    return this.finish('candidate');
  }

  /** Releases timers and audio resources (e.g. when the component unmounts). */
  dispose(): void {
    clearInterval(this.ticker);
    this.connection?.close();
    this.micMeter?.dispose();
    this.aiMeter?.dispose();
    this.remoteAudio.srcObject = null;
    void this.context?.close().catch(() => undefined);
  }

  private attachRemote(stream: MediaStream, recorder: ConversationRecorder): void {
    this.remoteAudio.srcObject = stream;
    void this.remoteAudio.play().catch(() => undefined);
    this.aiMeter?.dispose();
    this.aiMeter = this.context ? new LevelMeter(this.context, stream) : undefined;
    recorder.addRemote(stream);
  }

  private handleSessionError(error: unknown): void {
    const code = error instanceof ApiError ? error.code : undefined;
    if (code === 'TIME_UP' || code === 'ALREADY_COMPLETED') {
      void this.finish('timeUp');
    } else if (code === 'TOO_MANY_CONNECTIONS') {
      this.update({ phase: 'dropped', error: 'tooManyConnections', canReconnect: false });
    } else if (code === 'REALTIME_UNAVAILABLE') {
      this.update({ phase: 'dropped', error: 'unavailable', canReconnect: true });
    } else {
      this.update({ phase: 'dropped', error: 'connectFailed', canReconnect: true });
    }
  }

  private handleDrop(reason: string): void {
    console.warn('[conversation] connection dropped:', reason);
    if (this.state.phase !== 'live' && this.state.phase !== 'connecting') return;
    this.connection = undefined;
    this.stopSegment();
    this.update({ phase: 'dropped', error: undefined, canReconnect: true });
    void this.uploader.flush();
  }

  /** Stops the current recording segment and uploads it in the background. */
  private stopSegment(): void {
    const recorder = this.recorder;
    this.recorder = undefined;
    this.aiMeter?.dispose();
    this.aiMeter = undefined;
    if (!recorder) return;
    this.recordingUploads.push(
      recorder
        .stop()
        .then((result) => (result ? this.uploadWithRetry(result.blob, result.durationMs) : true))
        .catch(() => false),
    );
  }

  private async uploadWithRetry(blob: Blob, durationMs: number): Promise<boolean> {
    for (let attempt = 0; attempt < UPLOAD_RETRIES; attempt++) {
      try {
        await candidateApi.uploadRecording(this.token, blob, durationMs);
        return true;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 2_000 * (attempt + 1)));
      }
    }
    return false;
  }

  private async finish(reason: 'candidate' | 'timeUp'): Promise<void> {
    if (this.state.phase === 'finishing' || this.state.phase === 'ended') return;
    this.update({ phase: 'finishing', endReason: reason });

    this.connection?.close();
    this.connection = undefined;
    this.stopSegment();
    await this.uploader.flush();
    try {
      await candidateApi.end(this.token);
    } catch {
      // The API also auto-completes abandoned sessions after the time limit.
    }
    for (const track of this.mic.getTracks()) track.stop();

    this.update({ phase: 'ended', upload: this.recordingUploads.length ? 'uploading' : 'done' });
    const results = await Promise.all(this.recordingUploads);
    this.update({ upload: results.every(Boolean) ? 'done' : 'failed' });
    this.dispose();
  }
}

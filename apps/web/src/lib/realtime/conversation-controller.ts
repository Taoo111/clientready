import {
  SESSION_HARD_LIMIT_MS,
  type RealtimeSessionResult,
  type SpeakingPace,
} from '@clientready/shared';
import { CallAudio } from '../audio/call-audio';
import { SegmentRecorder } from '../audio/segment-recorder';
import { ApiError, candidateApi } from '../candidate-api';
import { reportProblem } from '../monitoring';
import { RealtimeConnection } from './connection';
import { PresenceSmoother, type PresenceState } from './presence';
import { TranscriptUploader } from './transcript-uploader';
import { UsageUploader } from './usage-uploader';

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
  /** Who is talking, smoothed for the label on the screen. */
  presence: PresenceState;
  endReason?: 'candidate' | 'timeUp';
  upload: UploadStatus;
  /** How fast the client speaks (button, or the client itself when asked by voice). */
  pace: SpeakingPace;
}

const TICK_MS = 100;

/**
 * Runs the live conversation: realtime connection(s), timer and hard stop, transcript
 * upload, recording per connection segment, reconnects and the final `end` call.
 * Must be constructed from a user gesture (CallAudio creates the AudioContext).
 */
export class ConversationController {
  private state: ConversationState = {
    phase: 'connecting',
    canReconnect: true,
    remainingMs: SESSION_HARD_LIMIT_MS,
    micLevel: 0,
    aiLevel: 0,
    presence: 'connecting',
    upload: 'idle',
    pace: 'normal',
  };
  private readonly audio: CallAudio;
  private readonly uploader: TranscriptUploader;
  private readonly usage: UsageUploader;
  private readonly recorder: SegmentRecorder;
  private connection: RealtimeConnection | undefined;
  private sessionStartEpochMs: number | undefined;
  private readonly presence = new PresenceSmoother();
  private readonly ticker: ReturnType<typeof setInterval>;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly token: string,
    private readonly mic: MediaStream,
  ) {
    this.audio = new CallAudio(mic);
    this.uploader = new TranscriptUploader(token);
    this.usage = new UsageUploader(token);
    this.recorder = new SegmentRecorder(this.audio.context, mic, (blob, durationMs) =>
      candidateApi.uploadRecording(token, blob, durationMs),
    );
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
    const aiLevel = this.audio.aiLevel();
    const patch: Partial<ConversationState> = {
      micLevel: this.audio.micLevel(),
      aiLevel,
      presence: this.presence.update({
        now: Date.now(),
        connecting: this.state.phase === 'connecting',
        aiLevel,
      }),
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
    this.presence.reset();

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

    this.recorder.startSegment();

    const connectionId = crypto.randomUUID();
    const connection = new RealtimeConnection({
      clientSecret: session.clientSecret,
      mic: this.mic,
      timeCues: session.timeCues,
      sessionStartEpochMs: this.sessionStartEpochMs,
      initialPace: this.state.pace,
      paceNotes: session.paceNotes,
      onRemoteStream: (stream) => this.attachRemote(stream),
      onTurn: (turn) =>
        this.uploader.add(
          turn.speaker,
          turn.text,
          turn.startedAtEpochMs - (this.sessionStartEpochMs ?? turn.startedAtEpochMs),
          turn.durationMs,
        ),
      onDrop: (reason) => this.handleDrop(reason),
      onActivity: (activity) => this.presence.activity(activity, Date.now()),
      onUsage: (usage) => this.usage.update(connectionId, usage),
      onPaceChange: (pace) => this.update({ pace }),
    });
    this.connection = connection;

    try {
      await connection.connect();
    } catch (error) {
      console.warn('[conversation] connect failed', error);
      reportProblem('realtime', error);
      connection.close();
      if (this.state.phase !== 'connecting') return;
      this.stopSegment();
      this.update({ phase: 'dropped', error: 'connectFailed', canReconnect: true });
      return;
    }
    if (this.state.phase === 'connecting') this.update({ phase: 'live' });
  }

  /** The candidate changed the client's speaking pace with the button. */
  setPace(pace: SpeakingPace): void {
    if (pace === this.state.pace) return;
    this.update({ pace });
    this.connection?.setPace(pace);
  }

  /** The candidate chose to end the conversation. */
  endByCandidate(): Promise<void> {
    return this.finish('candidate');
  }

  /** Releases timers and audio resources (e.g. when the component unmounts). */
  dispose(): void {
    clearInterval(this.ticker);
    this.connection?.close();
    this.audio.dispose();
  }

  private attachRemote(stream: MediaStream): void {
    this.audio.playRemote(stream);
    this.recorder.addRemote(stream);
  }

  private handleSessionError(error: unknown): void {
    const code = error instanceof ApiError ? error.code : undefined;
    if (code === 'TIME_UP' || code === 'ALREADY_COMPLETED') {
      void this.finish('timeUp');
    } else if (code === 'TOO_MANY_CONNECTIONS') {
      reportProblem('realtime', 'too many connections for one assessment', 'warning');
      this.update({ phase: 'dropped', error: 'tooManyConnections', canReconnect: false });
    } else if (code === 'REALTIME_UNAVAILABLE') {
      reportProblem('realtime', 'realtime service unavailable');
      this.update({ phase: 'dropped', error: 'unavailable', canReconnect: true });
    } else {
      reportProblem('realtime', error);
      this.update({ phase: 'dropped', error: 'connectFailed', canReconnect: true });
    }
  }

  private handleDrop(reason: string): void {
    console.warn('[conversation] connection dropped:', reason);
    reportProblem('realtime', `connection dropped: ${reason}`, 'warning');
    if (this.state.phase !== 'live' && this.state.phase !== 'connecting') return;
    this.connection = undefined;
    this.stopSegment();
    this.update({ phase: 'dropped', error: undefined, canReconnect: true });
    void this.uploader.flush();
    void this.usage.flush();
  }

  /** Ends the current connection segment: its recording is uploaded in the background. */
  private stopSegment(): void {
    this.audio.stopRemote();
    this.recorder.stopSegment();
  }

  private async finish(reason: 'candidate' | 'timeUp'): Promise<void> {
    if (this.state.phase === 'finishing' || this.state.phase === 'ended') return;
    this.update({ phase: 'finishing', endReason: reason });

    this.connection?.close();
    this.connection = undefined;
    this.stopSegment();
    await Promise.all([this.uploader.flush(), this.usage.flush()]);
    try {
      await candidateApi.end(this.token);
    } catch {
      // The API also auto-completes abandoned sessions after the time limit.
    }
    for (const track of this.mic.getTracks()) track.stop();

    this.update({ phase: 'ended', upload: this.recorder.hasUploads ? 'uploading' : 'done' });
    const uploaded = await this.recorder.allUploaded();
    this.update({ upload: uploaded ? 'done' : 'failed' });
    this.dispose();
  }
}

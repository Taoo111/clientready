import { SESSION_HARD_LIMIT_MS, type RealtimeSessionResult } from '@clientready/shared';
import { CallAudio } from '../audio/call-audio';
import { InterruptionWatcher, type InterruptionCause } from '../audio/interruption';
import { liveMic } from '../audio/mic';
import { SegmentRecorder } from '../audio/segment-recorder';
import { ApiError, candidateApi } from '../candidate-api';
import { reportProblem } from '../monitoring';
import { RealtimeConnection } from './connection';
import type { ConversationState } from './conversation-state';
import { PresenceSmoother } from './presence';
import { TranscriptUploader } from './transcript-uploader';
import { UsageUploader } from './usage-uploader';

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
  };
  private readonly audio: CallAudio;
  private readonly uploader: TranscriptUploader;
  private readonly usage: UsageUploader;
  private readonly recorder: SegmentRecorder;
  private connection: RealtimeConnection | undefined;
  private sessionStartEpochMs: number | undefined;
  private mic: MediaStream;
  private remoteStream: MediaStream | undefined;
  private resumeNote: string | null = null;
  private readonly watcher = new InterruptionWatcher((cause) => this.handleInterruption(cause));
  private readonly presence = new PresenceSmoother();
  private readonly ticker: ReturnType<typeof setInterval>;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly token: string,
    mic: MediaStream,
  ) {
    this.mic = mic;
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
    const active = ['connecting', 'live', 'interrupted', 'dropped'].includes(this.state.phase);
    if (active && this.sessionStartEpochMs !== undefined && this.state.remainingMs <= 0) {
      void this.finish('timeUp');
    }
  }

  /** Starts (or resumes) the conversation. */
  async connect(): Promise<void> {
    if (this.state.phase !== 'connecting' && this.state.phase !== 'dropped') return;
    this.update({ phase: 'connecting', error: undefined });
    this.presence.reset();
    // A phone call may have taken the microphone meanwhile (connect runs from a click).
    if ((await this.useLiveMic()) === 'failed') {
      this.update({ phase: 'dropped', error: 'micUnavailable', canReconnect: true });
      return;
    }

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
    this.resumeNote = session.resumeNote;
    this.uploader.syncNextSeq(session.nextSeq);

    this.recorder.startSegment();

    const connectionId = crypto.randomUUID();
    const connection = new RealtimeConnection({
      clientSecret: session.clientSecret,
      mic: this.mic,
      timeCues: session.timeCues,
      sessionStartEpochMs: this.sessionStartEpochMs,
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
    if (this.state.phase !== 'connecting') return;
    this.update({ phase: 'live' });
    this.watcher.watch(this.mic, this.audio.context);
  }

  /** The candidate is back after an interruption (a click): working microphone, client goes on. */
  async continueAfterInterruption(): Promise<void> {
    if (this.state.phase !== 'interrupted') return;
    const mic = await this.useLiveMic();
    if (mic === 'failed') {
      this.update({ error: 'micUnavailable' });
      return;
    }
    if (mic === 'switched') {
      // The recording continues as a new part with the new microphone.
      this.recorder.stopSegment();
      this.recorder.startSegment();
      if (this.remoteStream) this.recorder.addRemote(this.remoteStream);
    }
    this.watcher.watch(this.mic, this.audio.context);
    this.connection?.resumeAfterInterruption(this.resumeNote);
    this.update({ phase: 'live', error: undefined });
  }

  /** The candidate chose to end the conversation. */
  endByCandidate(): Promise<void> {
    return this.finish('candidate');
  }

  /** Releases timers and audio resources (e.g. when the component unmounts). */
  dispose(): void {
    clearInterval(this.ticker);
    this.watcher.stop();
    this.connection?.close();
    this.audio.dispose();
  }

  private attachRemote(stream: MediaStream): void {
    this.remoteStream = stream;
    this.audio.playRemote(stream);
    this.recorder.addRemote(stream);
  }

  /**
   * Makes sure the call has a working microphone and audio: a phone call can end or mute the
   * track and suspend the page's audio. A new track replaces the old one on the live call.
   */
  private async useLiveMic(): Promise<'same' | 'switched' | 'failed'> {
    try {
      const mic = await liveMic(this.mic);
      await this.audio.resume();
      if (mic === this.mic) return 'same';
      this.mic = mic;
      this.audio.replaceMic(mic);
      this.recorder.setMic(mic);
      await this.connection?.replaceMic(mic);
      return 'switched';
    } catch (error) {
      reportProblem('realtime', error, 'warning');
      return 'failed';
    }
  }

  private handleInterruption(cause: InterruptionCause): void {
    if (this.state.phase !== 'live') return;
    reportProblem('realtime', `audio interrupted: ${cause}`, 'warning');
    this.update({ phase: 'interrupted', error: undefined });
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
    if (!['live', 'connecting', 'interrupted'].includes(this.state.phase)) return;
    this.watcher.stop();
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

    this.watcher.stop();
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

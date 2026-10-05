import { SPEAKING_SPEED, type SpeakingPace, type TimeCue } from '@clientready/shared';
import { reportProblem } from '../monitoring';
import { findPaceRequest } from './speaking-pace';
import {
  TurnTracker,
  type ConversationActivity,
  type FinalTurn,
  type ServerEvent,
} from './turn-tracker';
import { UsageMeter, type ConnectionUsage } from './usage-meter';

export type { ConversationActivity, FinalTurn } from './turn-tracker';

const CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
/** A "disconnected" peer connection often recovers by itself; give it a moment. */
const DISCONNECT_GRACE_MS = 5_000;

export interface RealtimeConnectionOptions {
  clientSecret: string;
  mic: MediaStream;
  /** Cues with offsets relative to `sessionStartEpochMs`. */
  timeCues: TimeCue[];
  sessionStartEpochMs: number;
  /** Pace to restore right after connecting (the candidate slowed the client down earlier). */
  initialPace: SpeakingPace;
  /** Private notes for the model when the candidate changes the pace with the button. */
  paceNotes: Record<SpeakingPace, string> | null;
  onRemoteStream: (stream: MediaStream) => void;
  onTurn: (turn: FinalTurn) => void;
  /** The connection was lost unexpectedly (not via `close()`). */
  onDrop: (reason: string) => void;
  /** Turn-taking signals for the UI ("thinking" between the candidate's turn and the reply). */
  onActivity?: (activity: ConversationActivity) => void;
  /** Running token totals of this connection changed (cost tracking). */
  onUsage?: (usage: ConnectionUsage) => void;
  /** The AI client changed its speaking pace itself (the candidate asked by voice). */
  onPaceChange?: (pace: SpeakingPace) => void;
}

/**
 * One WebRTC call to the OpenAI Realtime API (GA interface):
 * mic track + "oai-events" data channel, SDP exchanged via POST /v1/realtime/calls
 * using the ephemeral client secret minted by our API.
 */
export class RealtimeConnection {
  private pc: RTCPeerConnection | undefined;
  private dc: RTCDataChannel | undefined;
  private closed = false;
  private disconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly cueTimers: ReturnType<typeof setTimeout>[] = [];
  private readonly turns: TurnTracker;
  private readonly usage = new UsageMeter();
  private rateLimitRetries = 0;
  /** A response is being generated: the voice speed can only change between turns. */
  private responseActive = false;
  private pace: SpeakingPace;
  private paceUpdatePending = false;

  constructor(private readonly options: RealtimeConnectionOptions) {
    this.turns = new TurnTracker({ onTurn: options.onTurn, onActivity: options.onActivity });
    this.pace = options.initialPace;
  }

  async connect(): Promise<void> {
    const pc = new RTCPeerConnection();
    this.pc = pc;

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) this.options.onRemoteStream(stream);
    };
    pc.onconnectionstatechange = () => this.handleConnectionState();

    for (const track of this.options.mic.getAudioTracks()) {
      pc.addTrack(track, this.options.mic);
    }

    const dc = pc.createDataChannel('oai-events');
    this.dc = dc;
    dc.onmessage = (event) => this.handleEvent(event.data);
    dc.onclose = () => this.drop('data channel closed');
    const opened = new Promise<void>((resolve, reject) => {
      dc.onopen = () => resolve();
      setTimeout(() => reject(new Error('Data channel did not open')), 15_000);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const response = await fetch(CALLS_URL, {
      method: 'POST',
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${this.options.clientSecret}`,
        'Content-Type': 'application/sdp',
      },
    });
    if (!response.ok) {
      throw new Error(`Realtime call rejected: ${response.status}`);
    }
    await pc.setRemoteDescription({ type: 'answer', sdp: await response.text() });
    await opened;

    if (this.pace !== 'normal') this.setPace(this.pace);
    // The AI speaks first: greeting on a new call, "we got disconnected" on a resume.
    this.send({ type: 'response.create' });
    this.scheduleCues();
  }

  /**
   * Changes the voice speed (the candidate's button). Applied now, or after the current
   * response; the model gets a private note so it also simplifies its language.
   */
  setPace(pace: SpeakingPace): void {
    this.pace = pace;
    const note = this.options.paceNotes?.[pace];
    if (note) this.addPrivateNote(note);
    if (this.responseActive) this.paceUpdatePending = true;
    else this.applyPace();
  }

  close(): void {
    this.closed = true;
    clearTimeout(this.disconnectTimer);
    for (const timer of this.cueTimers) clearTimeout(timer);
    this.dc?.close();
    this.pc?.close();
  }

  private send(event: Record<string, unknown>): void {
    if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify(event));
  }

  private scheduleCues(): void {
    for (const cue of this.options.timeCues) {
      const delay = this.options.sessionStartEpochMs + cue.atMs - Date.now();
      if (delay < 0) continue;
      this.cueTimers.push(
        setTimeout(() => {
          this.addPrivateNote(cue.text);
        }, delay),
      );
    }
  }

  /** A note for the model only; it does not trigger a response by itself. */
  private addPrivateNote(text: string): void {
    this.send({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'system', content: [{ type: 'input_text', text }] },
    });
  }

  private applyPace(): void {
    this.paceUpdatePending = false;
    this.send({
      type: 'session.update',
      session: { type: 'realtime', audio: { output: { speed: SPEAKING_SPEED[this.pace] } } },
    });
  }

  /** The model called the pace tool: apply it, return the result and let the model go on. */
  private handlePaceRequest(response: unknown): void {
    const request = findPaceRequest(response);
    if (!request) return;
    this.pace = request.pace;
    this.applyPace();
    this.send({
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: request.callId, output: 'done' },
    });
    this.send({ type: 'response.create' });
    this.options.onPaceChange?.(request.pace);
  }

  private handleConnectionState(): void {
    const state = this.pc?.connectionState;
    if (state === 'connected') {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = undefined;
    } else if (state === 'disconnected') {
      this.disconnectTimer ??= setTimeout(
        () => this.drop('peer connection disconnected'),
        DISCONNECT_GRACE_MS,
      );
    } else if (state === 'failed') {
      this.drop('peer connection failed');
    }
  }

  private drop(reason: string): void {
    if (this.closed) return;
    this.close();
    this.options.onDrop(reason);
  }

  private handleEvent(raw: unknown): void {
    let event: ServerEvent;
    try {
      event = JSON.parse(String(raw)) as ServerEvent;
    } catch {
      return;
    }
    if (this.usage.handle(event)) this.options.onUsage?.(this.usage.totals());
    if (this.turns.handle(event, Date.now())) return;

    switch (event.type) {
      case 'response.created':
        this.responseActive = true;
        break;

      case 'response.done': {
        this.responseActive = false;
        if (this.paceUpdatePending) this.applyPace();
        this.handlePaceRequest(event.response);
        this.options.onActivity?.('response-done');
        // A response rejected by the rate limit leaves the client silent: ask again shortly.
        const response = event.response as
          { status?: string; status_details?: { error?: { code?: string } } } | undefined;
        if (
          response?.status === 'failed' &&
          response.status_details?.error?.code === 'rate_limit_exceeded' &&
          this.rateLimitRetries < 3
        ) {
          this.rateLimitRetries++;
          setTimeout(() => this.send({ type: 'response.create' }), 1_500 * this.rateLimitRetries);
        } else if (response?.status === 'completed') {
          this.rateLimitRetries = 0;
        }
        break;
      }

      case 'error':
        console.warn('[realtime] error event', event.error);
        reportProblem('realtime', `error event: ${JSON.stringify(event.error)}`, 'warning');
        break;

      default:
        if (process.env.NODE_ENV === 'development' && !IGNORED_EVENTS.has(event.type)) {
          console.debug('[realtime]', event.type);
        }
    }
  }
}

/** High-frequency events not worth logging in development. */
const IGNORED_EVENTS = new Set([
  'response.output_audio.delta',
  'conversation.item.input_audio_transcription.delta',
  'rate_limits.updated',
]);

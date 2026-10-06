import { TURN_DETECTION_EAGERNESS, TURN_DETECTION_TYPE, type TimeCue } from '@clientready/shared';
import { reportProblem } from '../monitoring';
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
  onRemoteStream: (stream: MediaStream) => void;
  onTurn: (turn: FinalTurn) => void;
  /** The connection was lost unexpectedly (not via `close()`). */
  onDrop: (reason: string) => void;
  /** Turn-taking signals for the UI ("thinking" between the candidate's turn and the reply). */
  onActivity?: (activity: ConversationActivity) => void;
  /** Running token totals of this connection changed (cost tracking). */
  onUsage?: (usage: ConnectionUsage) => void;
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
  /** The session starts without interruptions (see TURN_DETECTION_TYPE). */
  private interruptionsOn = false;

  constructor(private readonly options: RealtimeConnectionOptions) {
    this.turns = new TurnTracker({ onTurn: options.onTurn, onActivity: options.onActivity });
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

    // The AI speaks first: greeting on a new call, "we got disconnected" on a resume.
    this.send({ type: 'response.create' });
    this.scheduleCues();
  }

  /**
   * Sends a new microphone track on the running call (the old one was taken by another app,
   * e.g. a phone call). No renegotiation needed: same call, same conversation.
   */
  async replaceMic(mic: MediaStream): Promise<void> {
    const [track] = mic.getAudioTracks();
    const sender = this.pc?.getSenders().find((s) => s.track?.kind === 'audio' || !s.track);
    if (track && sender) await sender.replaceTrack(track);
  }

  /** After an interruption: tells the model (privately) and lets it speak first. */
  resumeAfterInterruption(note: string | null): void {
    if (note) this.addPrivateNote(note);
    this.send({ type: 'response.create' });
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

  /**
   * After the client's first turn the candidate may interrupt it again (barge-in), like in
   * a normal call. A partial session.update: transcription and noise settings stay.
   */
  private enableInterruptions(): void {
    this.interruptionsOn = true;
    this.send({
      type: 'session.update',
      session: {
        type: 'realtime',
        audio: {
          input: {
            // The whole turn_detection object is replaced, so the eagerness is sent again.
            turn_detection: {
              type: TURN_DETECTION_TYPE,
              eagerness: TURN_DETECTION_EAGERNESS,
              interrupt_response: true,
            },
          },
        },
      },
    });
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
      case 'response.done': {
        this.options.onActivity?.('response-done');
        if (!this.interruptionsOn) this.enableInterruptions();
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

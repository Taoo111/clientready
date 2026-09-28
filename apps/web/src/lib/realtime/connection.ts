import type { Speaker, TimeCue } from '@clientready/shared';

const CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
/** A "disconnected" peer connection often recovers by itself; give it a moment. */
const DISCONNECT_GRACE_MS = 5_000;

export interface FinalTurn {
  speaker: Speaker;
  text: string;
  /** Epoch ms when the turn started. */
  startedAtEpochMs: number;
  /** Spoken duration, when speech start and stop were both observed. */
  durationMs?: number;
}

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
}

type ServerEvent = { type: string } & Record<string, unknown>;

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
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
  /** item_id -> epoch ms when the candidate started speaking. */
  private readonly speechStarts = new Map<string, number>();
  /** item_id -> epoch ms when the candidate stopped speaking. */
  private readonly speechStops = new Map<string, number>();
  /** response_id -> epoch ms when the AI started speaking. */
  private readonly responseStarts = new Map<string, number>();
  private readonly finishedResponses = new Set<string>();
  private rateLimitRetries = 0;

  constructor(private readonly options: RealtimeConnectionOptions) {}

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
          // A private note for the model; it does not trigger a response by itself.
          this.send({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'system',
              content: [{ type: 'input_text', text: cue.text }],
            },
          });
        }, delay),
      );
    }
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
    const now = Date.now();

    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        this.speechStarts.set(str(event.item_id), now);
        break;

      case 'input_audio_buffer.speech_stopped':
        this.speechStops.set(str(event.item_id), now);
        break;

      case 'conversation.item.input_audio_transcription.completed':
      case 'conversation.item.input_audio_transcription.failed': {
        const itemId = str(event.item_id);
        const text =
          event.type === 'conversation.item.input_audio_transcription.failed'
            ? '[inaudible]'
            : str(event.transcript).trim();
        const startedAt = this.speechStarts.get(itemId);
        const stoppedAt = this.speechStops.get(itemId);
        if (text) {
          this.options.onTurn({
            speaker: 'CANDIDATE',
            text,
            startedAtEpochMs: startedAt ?? now,
            durationMs:
              startedAt !== undefined && stoppedAt !== undefined
                ? stoppedAt - startedAt
                : undefined,
          });
        }
        this.speechStarts.delete(itemId);
        this.speechStops.delete(itemId);
        break;
      }

      // GA name first; the legacy (beta) name is still present in some SDK typings.
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta': {
        const responseId = str(event.response_id);
        if (!this.responseStarts.has(responseId)) this.responseStarts.set(responseId, now);
        break;
      }

      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done': {
        const responseId = str(event.response_id);
        const key = `${responseId}:${str(event.item_id)}:${String(event.content_index ?? 0)}`;
        if (this.finishedResponses.has(key)) break;
        this.finishedResponses.add(key);
        const text = str(event.transcript).trim();
        if (text) {
          this.options.onTurn({
            speaker: 'AI',
            text,
            startedAtEpochMs: this.responseStarts.get(responseId) ?? now,
          });
        }
        this.responseStarts.delete(responseId);
        break;
      }

      case 'response.done': {
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
  'response.output_audio_transcript.delta',
  'conversation.item.input_audio_transcription.delta',
  'rate_limits.updated',
]);

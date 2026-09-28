import type { Speaker, TranscriptTurnInput } from '@clientready/shared';
import { candidateApi } from '../candidate-api';

const RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000];

/**
 * Queues finished transcript turns and sends them to the API. Sequence numbers are
 * assigned here; the API upserts by (assessment, seq), so retries are safe.
 */
export class TranscriptUploader {
  private nextSeq = 0;
  private pending: TranscriptTurnInput[] = [];
  private inFlight: Promise<void> | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private attempt = 0;

  constructor(private readonly token: string) {}

  /** Never goes backwards, so turns still queued locally keep their numbers. */
  syncNextSeq(serverNextSeq: number): void {
    this.nextSeq = Math.max(this.nextSeq, serverNextSeq);
  }

  add(speaker: Speaker, text: string, startedAtMs: number): void {
    this.pending.push({
      seq: this.nextSeq++,
      speaker,
      text: text.slice(0, 4000),
      startedAtMs: Math.max(0, Math.round(startedAtMs)),
    });
    void this.send();
  }

  /** Sends everything queued; resolves when the queue is empty or retries are exhausted. */
  async flush(): Promise<void> {
    clearTimeout(this.retryTimer);
    this.attempt = 0;
    for (let i = 0; i <= RETRY_DELAYS_MS.length && this.pending.length > 0; i++) {
      await this.send();
      if (this.pending.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[i] ?? 0));
      }
    }
  }

  private send(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (this.pending.length === 0) return Promise.resolve();

    const batch = this.pending.slice(0, 50);
    this.inFlight = candidateApi
      .saveTurns(this.token, batch)
      .then(() => {
        const sent = new Set(batch.map((t) => t.seq));
        this.pending = this.pending.filter((t) => !sent.has(t.seq));
        this.attempt = 0;
      })
      .catch(() => {
        const delay = RETRY_DELAYS_MS[Math.min(this.attempt++, RETRY_DELAYS_MS.length - 1)];
        clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => void this.send(), delay);
      })
      .finally(() => {
        this.inFlight = undefined;
      });
    return this.inFlight.then(() => {
      if (this.pending.length > 0 && this.attempt === 0) return this.send();
    });
  }
}

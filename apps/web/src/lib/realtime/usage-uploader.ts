import { candidateApi } from '../candidate-api';
import type { ConnectionUsage } from './usage-meter';

/** Usage changes after every reply; sending it that often would only add load. */
const SEND_INTERVAL_MS = 20_000;

/**
 * Sends each connection's running token totals to the API (cost tracking), at most every
 * few seconds and on `flush()`. The API overwrites totals per connection, so a failed send
 * is simply retried with the newer totals next time.
 */
export class UsageUploader {
  private readonly pending = new Map<string, ConnectionUsage>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private inFlight: Promise<void> | undefined;

  constructor(private readonly token: string) {}

  update(connectionId: string, usage: ConnectionUsage): void {
    this.pending.set(connectionId, usage);
    this.timer ??= setTimeout(() => void this.flush(), SEND_INTERVAL_MS);
  }

  async flush(): Promise<void> {
    clearTimeout(this.timer);
    this.timer = undefined;
    await this.inFlight;
    this.inFlight = this.sendPending();
    await this.inFlight;
    this.inFlight = undefined;
  }

  private async sendPending(): Promise<void> {
    const batch = [...this.pending];
    this.pending.clear();
    for (const [connectionId, usage] of batch) {
      try {
        await candidateApi.saveUsage(this.token, { connectionId, ...usage });
      } catch (error) {
        // Only cost tracking: keep it for the next send unless newer totals arrived meanwhile.
        console.warn('[usage] upload failed', error);
        if (!this.pending.has(connectionId)) this.pending.set(connectionId, usage);
      }
    }
  }
}

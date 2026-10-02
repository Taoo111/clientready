import {
  addUsage,
  EMPTY_USAGE,
  usageFromRealtimeResponse,
  usageFromTranscription,
  type TokenUsage,
} from '@clientready/shared';
import type { ServerEvent } from './turn-tracker';

export interface ConnectionUsage {
  realtime: TokenUsage;
  transcription: TokenUsage;
}

/**
 * Running token totals of one realtime connection, from the `usage` that OpenAI attaches to
 * every finished response and transcription. Pure bookkeeping, unit-tested with sample events.
 */
export class UsageMeter {
  private usage: ConnectionUsage = { realtime: EMPTY_USAGE, transcription: EMPTY_USAGE };

  /** Returns true when the totals changed. */
  handle(event: ServerEvent): boolean {
    if (event.type === 'response.done') {
      const response = event.response as { usage?: unknown } | undefined;
      if (!response?.usage) return false;
      this.usage = {
        ...this.usage,
        realtime: addUsage(this.usage.realtime, usageFromRealtimeResponse(response.usage)),
      };
      return true;
    }
    if (event.type === 'conversation.item.input_audio_transcription.completed' && event.usage) {
      this.usage = {
        ...this.usage,
        transcription: addUsage(this.usage.transcription, usageFromTranscription(event.usage)),
      };
      return true;
    }
    return false;
  }

  totals(): ConnectionUsage {
    return this.usage;
  }
}

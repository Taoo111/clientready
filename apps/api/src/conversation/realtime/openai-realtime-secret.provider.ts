import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { Env } from '../../config/env';
import {
  RealtimeSecretProvider,
  RealtimeUnavailableError,
  type RealtimeSecret,
  type RealtimeSecretRequest,
} from './realtime-secret.provider';

const CLIENT_SECRETS_URL = 'https://api.openai.com/v1/realtime/client_secrets';
/** The secret is only needed to establish the WebRTC call. */
const SECRET_TTL_SECONDS = 120;

const ClientSecretResponseSchema = z.object({
  value: z.string().min(1),
  expires_at: z.number().int(),
});

/**
 * OpenAI Realtime GA: POST /v1/realtime/client_secrets with the full session
 * config; the browser then connects via POST /v1/realtime/calls (WebRTC).
 */
@Injectable()
export class OpenAiRealtimeSecretProvider extends RealtimeSecretProvider {
  private readonly logger = new Logger(OpenAiRealtimeSecretProvider.name);

  constructor(private readonly config: ConfigService<Env, true>) {
    super();
  }

  async createSecret(request: RealtimeSecretRequest): Promise<RealtimeSecret> {
    const apiKey = this.config.get('OPENAI_API_KEY', { infer: true });
    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY is not set');
      throw new RealtimeUnavailableError('OPENAI_API_KEY is not set');
    }
    const model = this.config.get('OPENAI_REALTIME_MODEL', { infer: true });
    const reasoningEffort = this.config.get('OPENAI_REALTIME_REASONING_EFFORT', { infer: true });

    const body = {
      expires_after: { anchor: 'created_at', seconds: SECRET_TTL_SECONDS },
      session: {
        type: 'realtime',
        model,
        instructions: request.instructions,
        // Older non-reasoning models (e.g. gpt-realtime-mini) reject this option.
        ...(reasoningEffort === 'none' ? {} : { reasoning: { effort: reasoningEffort } }),
        output_modalities: ['audio'],
        audio: {
          input: {
            transcription: { model: this.config.get('OPENAI_TRANSCRIBE_MODEL', { infer: true }) },
            turn_detection: { type: 'semantic_vad' },
          },
          output: { voice: this.config.get('OPENAI_REALTIME_VOICE', { infer: true }) },
        },
      },
    };

    let response: Response;
    try {
      response = await fetch(CLIENT_SECRETS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Safety-Identifier': request.safetyIdentifier,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      this.logger.error(`Realtime client secret request failed: ${String(error)}`);
      throw new RealtimeUnavailableError('Request failed');
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 1000);
      this.logger.error(`Realtime client secret rejected (${response.status}): ${detail}`);
      throw new RealtimeUnavailableError(`OpenAI returned ${response.status}`);
    }

    const parsed = ClientSecretResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      this.logger.error(`Unexpected client secret response: ${parsed.error.message}`);
      throw new RealtimeUnavailableError('Unexpected response');
    }
    return { value: parsed.data.value, expiresAt: parsed.data.expires_at, model };
  }
}

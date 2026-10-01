export interface RealtimeSecretRequest {
  instructions: string;
  /** Stable, non-identifying id of the end user (for OpenAI abuse monitoring). */
  safetyIdentifier: string;
}

export interface RealtimeSecret {
  value: string;
  /** Unix seconds. */
  expiresAt: number;
  model: string;
}

/** Mints short-lived client secrets for the browser's realtime (WebRTC) connection. */
export abstract class RealtimeSecretProvider {
  abstract createSecret(request: RealtimeSecretRequest): Promise<RealtimeSecret>;
}

export class RealtimeUnavailableError extends Error {}

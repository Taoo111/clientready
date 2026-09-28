import {
  PublicAssessmentViewSchema,
  PublicErrorCodeSchema,
  RealtimeSessionResultSchema,
  RecordingUploadResultSchema,
  type PublicAssessmentView,
  type PublicErrorCode,
  type RealtimeSessionResult,
  type RecordingUploadResult,
  type TranscriptTurnInput,
} from '@clientready/shared';
import { z } from 'zod';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: PublicErrorCode | undefined,
    message: string,
  ) {
    super(message);
  }
}

/** The request failed before an HTTP response arrived (offline, DNS, CORS…). */
export class NetworkError extends Error {}

const ErrorBodySchema = z.object({ code: PublicErrorCodeSchema.optional() });

async function request<T extends z.ZodType>(
  path: string,
  schema: T,
  init: RequestInit = {},
): Promise<z.infer<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { cache: 'no-store', ...init });
  } catch (error) {
    throw new NetworkError(error instanceof Error ? error.message : String(error));
  }
  const body: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    const parsed = ErrorBodySchema.safeParse(body);
    throw new ApiError(
      res.status,
      parsed.success ? parsed.data.code : undefined,
      `${res.status} ${path}`,
    );
  }
  return schema.parse(body);
}

const base = (token: string) => `/public/assessments/${encodeURIComponent(token)}`;

function extensionFor(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

export const candidateApi = {
  view: (token: string): Promise<PublicAssessmentView> =>
    request(base(token), PublicAssessmentViewSchema),

  consent: (token: string): Promise<PublicAssessmentView> =>
    request(`${base(token)}/consent`, PublicAssessmentViewSchema, { method: 'POST' }),

  realtimeSession: (token: string): Promise<RealtimeSessionResult> =>
    request(`${base(token)}/realtime-session`, RealtimeSessionResultSchema, { method: 'POST' }),

  saveTurns: (token: string, turns: TranscriptTurnInput[]): Promise<unknown> =>
    request(`${base(token)}/turns`, z.unknown(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turns }),
      // Lets the last transcript flush survive the page being closed.
      keepalive: true,
    }),

  end: (token: string): Promise<PublicAssessmentView> =>
    request(`${base(token)}/end`, PublicAssessmentViewSchema, { method: 'POST', keepalive: true }),

  uploadRecording: (
    token: string,
    blob: Blob,
    durationMs: number,
  ): Promise<RecordingUploadResult> => {
    const form = new FormData();
    form.append('durationMs', String(Math.round(durationMs)));
    form.append('file', blob, `recording.${extensionFor(blob.type)}`);
    return request(`${base(token)}/recording`, RecordingUploadResultSchema, {
      method: 'POST',
      body: form,
    });
  },
};

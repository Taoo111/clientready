import { SPEAKING_PACE_TOOL, SpeakingPaceSchema, type SpeakingPace } from '@clientready/shared';
import { z } from 'zod';

export interface PaceRequest {
  callId: string;
  pace: SpeakingPace;
}

const FunctionCallSchema = z.object({
  type: z.literal('function_call'),
  name: z.literal(SPEAKING_PACE_TOOL),
  call_id: z.string().min(1),
  arguments: z.string(),
});

const ArgumentsSchema = z.object({ pace: SpeakingPaceSchema });

function parseArguments(raw: string): SpeakingPace | undefined {
  try {
    return ArgumentsSchema.parse(JSON.parse(raw)).pace;
  } catch {
    return undefined;
  }
}

/**
 * Finds the AI client's call of the speaking-pace tool in a finished response
 * (`response.done` → `response.output`). Malformed calls are ignored.
 */
export function findPaceRequest(response: unknown): PaceRequest | undefined {
  const output = (response as { output?: unknown } | undefined)?.output;
  if (!Array.isArray(output)) return undefined;
  for (const item of output) {
    const call = FunctionCallSchema.safeParse(item);
    if (!call.success) continue;
    const pace = parseArguments(call.data.arguments);
    if (pace) return { callId: call.data.call_id, pace };
  }
  return undefined;
}

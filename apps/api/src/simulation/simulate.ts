import {
  SESSION_HARD_LIMIT_MS,
  type RoleTemplate,
  type Speaker,
  type TargetLevel,
} from '@clientready/shared';
import OpenAI from 'openai';
import { OpenAIRealtimeWS } from 'openai/realtime/ws';
import type { ClientPromptModule } from '../prompts/client';
import { candidateInstructions, type PersonaId } from './personas';

export interface SimulatedTurn {
  speaker: Speaker;
  text: string;
  startedAtMs: number;
  durationMs: number;
}

export interface SimulationOptions {
  apiKey: string;
  realtimeModel: string;
  reasoningEffort: string;
  candidateModel: string;
  template: RoleTemplate;
  level: TargetLevel;
  persona: PersonaId;
  prompt: ClientPromptModule;
  /** Safety net on the number of AI turns. */
  maxAiTurns?: number;
  onTurn?: (turn: SimulatedTurn) => void;
  onWarning?: (message: string) => void;
}

// Speaking-time estimates for the simulated clock.
const AI_WORDS_PER_SECOND = 2.6;
const CANDIDATE_WORDS_PER_SECOND = 2.1;
const TURN_GAP_MS = 1_500;

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

type ResponseDoneEvent = { response: unknown };

/** Collects the text of a finished response from a `response.done` event. */
function responseText(event: ResponseDoneEvent): string {
  const response = event.response as {
    output?: Array<{ content?: Array<Record<string, unknown>> }>;
  };
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((c) =>
      typeof c.text === 'string' ? c.text : typeof c.transcript === 'string' ? c.transcript : '',
    )
    .join(' ')
    .trim();
}

/**
 * Runs a text-only conversation between the realtime model (with the client prompt, same
 * model and settings as live calls, but text instead of audio) and a simulated candidate.
 * Time cues are injected on a simulated clock derived from speaking-time estimates.
 */
export async function simulateConversation(options: SimulationOptions): Promise<SimulatedTurn[]> {
  const client = new OpenAI({ apiKey: options.apiKey });
  const rt = new OpenAIRealtimeWS({ model: options.realtimeModel }, client);
  const pending: Array<(event: ResponseDoneEvent) => void> = [];
  const failures: Error[] = [];

  let lastStatus = '';
  rt.on('response.done', (event) => {
    const response = event.response as { status?: string; status_details?: unknown };
    lastStatus = `${response.status ?? '?'} ${JSON.stringify(response.status_details ?? '')}`;
    pending.shift()?.(event);
  });
  rt.on('error', (error: Error) => failures.push(error));
  await new Promise<void>((resolve, reject) => {
    rt.socket.once('open', () => resolve());
    rt.socket.once('error', reject);
  });

  const send = (event: Record<string, unknown>) => rt.send(event as never);
  const nextResponse = () =>
    new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Realtime response timed out')), 60_000);
      pending.push((event) => {
        clearTimeout(timer);
        resolve(responseText(event));
      });
      send({ type: 'response.create' });
    });

  send({
    type: 'session.update',
    session: {
      type: 'realtime',
      instructions: options.prompt.buildClientInstructions({
        template: options.template,
        level: options.level,
        candidateName: 'Alex Morgan',
      }),
      output_modalities: ['text'],
      ...(options.reasoningEffort === 'none'
        ? {}
        : { reasoning: { effort: options.reasoningEffort } }),
      audio: { input: { turn_detection: null } },
    },
  });

  const cues = options.prompt.buildTimeCues(options.template);
  const transcript: SimulatedTurn[] = [];
  let clock = 0;
  const push = (speaker: Speaker, text: string) => {
    const durationMs = Math.round(
      (words(text) / (speaker === 'AI' ? AI_WORDS_PER_SECOND : CANDIDATE_WORDS_PER_SECOND)) * 1000,
    );
    const turn = { speaker, text, startedAtMs: clock, durationMs };
    transcript.push(turn);
    options.onTurn?.(turn);
    clock += durationMs + TURN_GAP_MS;
  };

  let farewells = 0;
  try {
    const maxAiTurns = options.maxAiTurns ?? 40;
    while (
      clock < SESSION_HARD_LIMIT_MS &&
      transcript.filter((t) => t.speaker === 'AI').length < maxAiTurns
    ) {
      // Private time notes, exactly like the browser sends them.
      while (cues.length && cues[0]!.atMs <= clock) {
        const cue = cues.shift()!;
        send({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'system',
            content: [{ type: 'input_text', text: cue.text }],
          },
        });
      }
      // Rate-limited responses come back empty: wait and retry with backoff.
      let aiText = await nextResponse();
      for (let attempt = 1; !aiText && attempt <= 5; attempt++) {
        const rateLimited = lastStatus.includes('rate_limit');
        options.onWarning?.(
          `empty response (${rateLimited ? 'rate limit' : lastStatus}); retry ${attempt}`,
        );
        if (!rateLimited && attempt > 1) break;
        await new Promise((resolve) => setTimeout(resolve, 5_000 * attempt));
        aiText = await nextResponse();
      }
      if (failures.length) throw failures[0];
      if (!aiText) {
        options.onWarning?.(`no response (${lastStatus}); stopping`);
        break;
      }
      push('AI', aiText);
      if (clock >= SESSION_HARD_LIMIT_MS) break;
      // A real candidate stops talking after the farewell; two bots would say goodbye forever.
      if (/\b(good ?bye|bye|take care)\b/i.test(aiText) && ++farewells >= 2) break;

      const candidate = await client.responses.create({
        model: options.candidateModel,
        instructions: candidateInstructions(options.persona, options.template.name),
        input: transcript
          .map((t) => `${t.speaker === 'AI' ? 'Client' : 'You'}: ${t.text}`)
          .join('\n'),
      });
      const candidateText = candidate.output_text.trim();
      push('CANDIDATE', candidateText);
      send({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: candidateText }],
        },
      });
    }
  } finally {
    rt.close();
  }
  return transcript;
}

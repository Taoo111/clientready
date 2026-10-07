import type { Recommendation, TargetLevel } from '@clientready/shared';
import type { EvalTurn } from '../../../src/evaluation/transcript';

/** One line of a scripted conversation: client (AI) or candidate, with spoken seconds. */
export type ScriptLine = ['AI' | 'C', string, number?];

export interface TranscriptFixture {
  name: string;
  description: string;
  templateId: string;
  targetLevel: TargetLevel;
  expected: {
    recommendation: Recommendation;
    /** Acceptable speaking CEFR range (inclusive). */
    speaking: [string, string];
    /** Acceptable listening CEFR range (inclusive), when the fixture is about listening too. */
    listening?: [string, string];
  };
  turns: EvalTurn[];
  conversationMs: number;
}

const AI_WORDS_PER_SECOND = 2.6;
/** Pause between turns (turn-taking latency plus thinking time). */
const GAP_MS = 3_000;

/**
 * Lays the script out on a timeline. Candidate lines give their spoken seconds (so slow,
 * hesitant speakers take longer per word); client lines are timed from their word count.
 */
export function buildTurns(script: ScriptLine[]): { turns: EvalTurn[]; conversationMs: number } {
  let at = 2_000;
  const turns = script.map(([who, text, seconds], seq): EvalTurn => {
    const words = text.split(/\s+/).length;
    const durationMs =
      who === 'C' ? (seconds ?? words / 2.2) * 1000 : (words / AI_WORDS_PER_SECOND) * 1000;
    const turn: EvalTurn = {
      seq,
      speaker: who === 'AI' ? 'AI' : 'CANDIDATE',
      text,
      startedAtMs: Math.round(at),
      durationMs: who === 'C' ? Math.round(durationMs) : null,
    };
    at += durationMs + GAP_MS;
    return turn;
  });
  return { turns, conversationMs: Math.round(at) };
}

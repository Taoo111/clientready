import type { Speaker, TranscriptStats } from '@clientready/shared';

export interface EvalTurn {
  seq: number;
  speaker: Speaker;
  text: string;
  startedAtMs: number;
  durationMs: number | null;
}

/** Used when a turn has no measured duration (~130 words per minute). */
const WORDS_PER_SECOND = 130 / 60;

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function sortTurns<T extends EvalTurn>(turns: readonly T[]): T[] {
  return [...turns].sort((a, b) => a.startedAtMs - b.startedAtMs || a.seq - b.seq);
}

export function computeStats(turns: readonly EvalTurn[], conversationMs: number): TranscriptStats {
  const candidate = turns.filter((t) => t.speaker === 'CANDIDATE');
  let words = 0;
  let speechMs = 0;
  for (const turn of candidate) {
    const turnWords = countWords(turn.text);
    words += turnWords;
    speechMs += turn.durationMs ?? Math.round((turnWords / WORDS_PER_SECOND) * 1000);
  }
  return {
    conversationMs: Math.max(0, Math.round(conversationMs)),
    candidateTurns: candidate.length,
    candidateWords: words,
    candidateSpeechMs: speechMs,
  };
}

export interface SufficiencyThresholds {
  minConversationMs: number;
  minCandidateSpeechMs: number;
}

function minutes(ms: number): string {
  return (ms / 60_000).toFixed(1).replace('.', ',');
}

/**
 * Rule-based check before any model call: too short or interrupted conversations are
 * not scored at all. Returns the reason (Polish) or null when there is enough data.
 */
export function insufficientDataReason(
  stats: TranscriptStats,
  thresholds: SufficiencyThresholds,
): string | null {
  if (stats.conversationMs < thresholds.minConversationMs) {
    return (
      `Rozmowa trwała tylko ${minutes(stats.conversationMs)} min (minimum ${minutes(thresholds.minConversationMs)} min) — ` +
      'została przerwana lub zakończona zbyt wcześnie, więc nie obejmuje wszystkich części. Za mało danych do rzetelnej oceny.'
    );
  }
  if (stats.candidateSpeechMs < thresholds.minCandidateSpeechMs) {
    return (
      `Kandydat mówił łącznie ok. ${minutes(stats.candidateSpeechMs)} min (minimum ${minutes(thresholds.minCandidateSpeechMs)} min). ` +
      'Za mało wypowiedzi kandydata do rzetelnej oceny.'
    );
  }
  return null;
}

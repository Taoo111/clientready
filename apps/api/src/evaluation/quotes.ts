import type { EvidenceKind, EvidenceQuote } from '@clientready/shared';
import type { EvalTurn } from './transcript';

/**
 * Normalises text for quote matching: case, Unicode forms, typographic quotes and
 * apostrophes, punctuation and whitespace do not matter.
 */
export function normalizeForMatch(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`´']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** A quote may skip words with "..." / "…" between fragments of the same turn. */
function fragments(quote: string): string[] {
  return quote
    .split(/\.{3,}|…/)
    .map(normalizeForMatch)
    .filter((f) => f.length > 0);
}

function containsInOrder(haystack: string, parts: string[]): boolean {
  // Pad with spaces so fragments only match on word boundaries.
  const padded = ` ${haystack} `;
  let from = 0;
  for (const part of parts) {
    const index = padded.indexOf(` ${part} `, from);
    if (index === -1) return false;
    from = index + part.length + 1;
  }
  return true;
}

export interface QuoteCandidate {
  quote: string;
  seq?: number;
  kind?: EvidenceKind;
}

/**
 * Returns the candidate turn that contains the quote (checking the turn the model
 * pointed to first), or undefined if the quote does not occur in the transcript.
 */
export function findQuote(
  quote: QuoteCandidate,
  candidateTurns: readonly EvalTurn[],
): EvalTurn | undefined {
  const parts = fragments(quote.quote);
  if (parts.length === 0) return undefined;
  const hinted = candidateTurns.find((t) => t.seq === quote.seq);
  const ordered = hinted ? [hinted, ...candidateTurns.filter((t) => t !== hinted)] : candidateTurns;
  return ordered.find((turn) => containsInOrder(normalizeForMatch(turn.text), parts));
}

export interface VerifiedQuotes {
  accepted: EvidenceQuote[];
  rejected: QuoteCandidate[];
}

/** Keeps only quotes that really occur in candidate turns (max `limit`, de-duplicated). */
export function verifyQuotes(
  quotes: readonly QuoteCandidate[],
  turns: readonly EvalTurn[],
  limit = 3,
): VerifiedQuotes {
  const candidateTurns = turns.filter((t) => t.speaker === 'CANDIDATE');
  const accepted: EvidenceQuote[] = [];
  const rejected: QuoteCandidate[] = [];
  const seen = new Set<string>();
  for (const quote of quotes) {
    const turn = findQuote(quote, candidateTurns);
    if (!turn) {
      rejected.push(quote);
      continue;
    }
    const key = normalizeForMatch(quote.quote);
    if (seen.has(key) || accepted.length >= limit) continue;
    seen.add(key);
    accepted.push({
      quote: quote.quote.trim(),
      seq: turn.seq,
      ...(quote.kind && { kind: quote.kind }),
    });
  }
  return { accepted, rejected };
}

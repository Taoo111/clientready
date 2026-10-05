export interface TextSegment {
  text: string;
  marked: boolean;
}

/** A quote may skip words with "..." / "…"; each fragment is highlighted on its own. */
function fragments(quote: string): string[] {
  return quote
    .split(/\.{3,}|…/)
    .map((f) => f.trim().replace(/^[\s"'“”‘’]+|[\s"'“”‘’.,;:!?]+$/g, ''))
    .filter((f) => f.length >= 3);
}

/**
 * Splits a transcript turn into plain and highlighted segments for the evidence quotes it
 * contains (case-insensitive). Quotes are verified with a looser match (punctuation ignored),
 * so a fragment that is not found literally is simply not highlighted.
 */
export function highlightQuotes(text: string, quotes: readonly string[]): TextSegment[] {
  const lower = text.toLowerCase();
  const ranges: Array<[number, number]> = [];
  for (const fragment of quotes.flatMap(fragments)) {
    const start = lower.indexOf(fragment.toLowerCase());
    if (start !== -1) ranges.push([start, start + fragment.length]);
  }
  if (ranges.length === 0) return [{ text, marked: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }

  const segments: TextSegment[] = [];
  let at = 0;
  for (const [start, end] of merged) {
    if (start > at) segments.push({ text: text.slice(at, start), marked: false });
    segments.push({ text: text.slice(start, end), marked: true });
    at = end;
  }
  if (at < text.length) segments.push({ text: text.slice(at), marked: false });
  return segments;
}

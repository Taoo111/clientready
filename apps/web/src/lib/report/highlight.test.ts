import { describe, expect, it } from 'vitest';
import { highlightQuotes } from './highlight';

const marked = (text: string, quotes: string[]) =>
  highlightQuotes(text, quotes)
    .filter((s) => s.marked)
    .map((s) => s.text);

describe('highlightQuotes', () => {
  it('marks a quote found in the turn, ignoring case', () => {
    const segments = highlightQuotes('Well, we moved the payouts to a queue.', [
      'we moved the payouts',
    ]);
    expect(segments).toEqual([
      { text: 'Well, ', marked: false },
      { text: 'we moved the payouts', marked: true },
      { text: ' to a queue.', marked: false },
    ]);
    expect(marked('WE MOVED it', ['we moved'])).toEqual(['WE MOVED']);
  });

  it('marks each fragment of a quote with "..." and merges overlaps', () => {
    const text = 'First we measured latency, then after a week we added a cache.';
    expect(marked(text, ['we measured latency ... we added a cache'])).toEqual([
      'we measured latency',
      'we added a cache',
    ]);
    expect(marked(text, ['First we measured', 'we measured latency'])).toEqual([
      'First we measured latency',
    ]);
  });

  it('leaves the turn unmarked when the quote is not found literally', () => {
    expect(highlightQuotes('We used Kafka.', ['we use kafka streams'])).toEqual([
      { text: 'We used Kafka.', marked: false },
    ]);
  });
});

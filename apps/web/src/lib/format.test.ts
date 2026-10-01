import { describe, expect, it } from 'vitest';
import { formatClock, formatCountdown, plainDashes } from './format';

describe('formatClock / formatCountdown', () => {
  it('formats elapsed time rounded down', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(61_999)).toBe('1:01');
    expect(formatClock(-5)).toBe('0:00');
  });

  it('rounds a countdown up so 0:00 means time is up', () => {
    expect(formatCountdown(500)).toBe('0:01');
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(12 * 60_000)).toBe('12:00');
  });
});

describe('plainDashes', () => {
  it('replaces em and en dashes with a spaced hyphen', () => {
    expect(plainDashes('Clear answer—good follow-up')).toBe('Clear answer - good follow-up');
    expect(plainDashes('B2 – C1')).toBe('B2 - C1');
  });
});

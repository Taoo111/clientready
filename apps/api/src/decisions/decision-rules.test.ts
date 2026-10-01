import { describe, expect, it } from 'vitest';
import { decide, DecisionCommentRequiredError, DecisionNotAllowedError } from './decision-rules';

describe('decide', () => {
  it('records agreement without a comment', () => {
    expect(decide('READY', { verdict: 'READY' })).toEqual({
      verdict: 'READY',
      agreesWithAi: true,
      comment: null,
    });
  });

  it('keeps an optional comment on agreement, trimmed', () => {
    expect(decide('NOT_READY', { verdict: 'NOT_READY', comment: '  ok  ' }).comment).toBe('ok');
  });

  it('requires an explanation for a disagreement', () => {
    expect(() => decide('READY', { verdict: 'NOT_READY' })).toThrow(DecisionCommentRequiredError);
    expect(() => decide('READY', { verdict: 'NOT_READY', comment: 'too short' })).toThrow(
      DecisionCommentRequiredError,
    );
    expect(
      decide('READY', { verdict: 'NOT_READY', comment: 'Struggled with the incident part.' }),
    ).toMatchObject({ verdict: 'NOT_READY', agreesWithAi: false });
  });

  it('is not possible without an AI recommendation', () => {
    expect(() => decide(null, { verdict: 'READY' })).toThrow(DecisionNotAllowedError);
  });
});

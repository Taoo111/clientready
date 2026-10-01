import { describe, expect, it } from 'vitest';
import { redactCandidateTokens, redactCandidateTokensDeep } from '../src/privacy.js';

const token = 'Qx3_vN8-kP2mL7rT9wYz4bC6dF1gH5jK0aSeU';

describe('redactCandidateTokens', () => {
  it('removes tokens from candidate page and API URLs', () => {
    expect(redactCandidateTokens(`https://app.example.com/a/${token}?x=1`)).toBe(
      'https://app.example.com/a/[token]?x=1',
    );
    expect(redactCandidateTokens(`POST /public/assessments/${token}/turns`)).toBe(
      'POST /public/assessments/[token]/turns',
    );
  });

  it('leaves other paths alone', () => {
    expect(redactCandidateTokens('/admin/assessments/cmupsg0fx0001nste8d4a8q5v')).toBe(
      '/admin/assessments/cmupsg0fx0001nste8d4a8q5v',
    );
  });

  it('redacts nested values', () => {
    const event = {
      request: { url: `https://x.dev/a/${token}` },
      breadcrumbs: [{ data: { url: `https://api.dev/public/assessments/${token}/end` } }],
    };
    expect(JSON.stringify(redactCandidateTokensDeep(event))).not.toContain(token);
  });
});

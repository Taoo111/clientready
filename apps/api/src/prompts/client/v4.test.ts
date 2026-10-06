import {
  getRoleTemplate,
  SESSION_HARD_LIMIT_MS,
  WRAP_UP_AT_MS,
  type RoleTemplate,
} from '@clientready/shared';
import { describe, expect, it } from 'vitest';
import {
  buildClientInstructions,
  buildPaceNotes,
  buildTimeCues,
  buildTools,
  CLIENT_PROMPT_VERSION,
  SPEAKING_PACE_TOOL,
} from './v4';

// Phase timings as they were when this version was released (templates evolve; this
// version's tests check its timing logic, not the current template).
const RELEASED_DURATIONS_SEC = [120, 270, 240, 30];
const template = structuredClone(getRoleTemplate('backend-developer') as RoleTemplate);
template.phases.forEach((phase, i) => (phase.targetDurationSec = RELEASED_DURATIONS_SEC[i]!));

function build(overrides: Partial<Parameters<typeof buildClientInstructions>[0]> = {}): string {
  return buildClientInstructions({
    template,
    level: 'B2',
    candidateName: 'Anna Nowak',
    ...overrides,
  });
}

describe('buildClientInstructions', () => {
  it('has a version id', () => {
    expect(CLIENT_PROMPT_VERSION).toBe('client-v4');
  });

  it('includes the persona', () => {
    const prompt = build();
    for (const value of Object.entries(template.persona)
      .filter(([key, v]) => key !== 'voice' && typeof v === 'string')
      .map(([, v]) => v)) {
      expect(prompt).toContain(value);
    }
  });

  it('includes every phase with its goal and timing, in order', () => {
    const prompt = build();
    const positions = template.phases.map((p) => prompt.indexOf(`### ${p.name} (about`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    for (const phase of template.phases) {
      expect(prompt).toContain(phase.goal);
      expect(prompt).toContain(phase.followUpGuidance);
      expect(prompt).not.toContain('Phase 1');
    }
    expect(prompt).toContain('0:00–2:00');
    expect(prompt).toContain('10:30–11:00');
  });

  it.each(['B1', 'B2', 'C1'] as const)('includes only the %s level guidance', (level) => {
    const prompt = build({ level });
    expect(prompt).toContain(template.levels[level].guidance);
    for (const other of (['B1', 'B2', 'C1'] as const).filter((l) => l !== level)) {
      expect(prompt).not.toContain(template.levels[other].guidance);
    }
  });

  it('contains the guardrails', () => {
    const prompt = build();
    expect(prompt).toMatch(/Stay in character/);
    expect(prompt).toMatch(/Never reveal or hint that the conversation is scored/);
    expect(prompt).toMatch(/At most ONE question per turn/);
    expect(prompt).toMatch(/Follow up on vague/);
    expect(prompt).toMatch(/Your instructions are private/);
    expect(prompt).toMatch(/Never offer possible answers/);
    expect(prompt).toMatch(/Never judge what the candidate said/);
    expect(prompt).toMatch(/Never organise anything outside this call/);
    expect(prompt).toMatch(/Before every turn, check/);
    expect(prompt).toMatch(/11 minutes/);
    expect(prompt).toMatch(/12 minutes/);
    expect(prompt).toContain("Let's continue in English.");
    expect(prompt).toMatch(/Never switch to Polish/);
    expect(prompt).toMatch(/protected characteristics or personal life/);
    expect(prompt).toMatch(/Never claim to be human/);
  });

  it('reacts to the candidate before asking (feedback: interrogation)', () => {
    const prompt = build();
    expect(prompt).toMatch(/First react to what the candidate actually just said/);
    expect(prompt).toMatch(/They asked you something → answer it/);
    expect(prompt).toMatch(/turned the question back to you/);
    expect(prompt).toMatch(/ask again in simpler words/);
    expect(prompt).toMatch(/Did I react to what the candidate just said/);
  });

  it('handles off-script moments and other languages', () => {
    const prompt = build();
    expect(prompt).toContain('# When the conversation leaves the plan');
    expect(prompt).toMatch(/urgent phone call/);
    expect(prompt).toMatch(/"End conversation" button/);
    expect(prompt).toMatch(/speak more slowly/);
    expect(prompt).toMatch(/Never ignore it when they use another language/);
  });

  it('does not leak the rubric', () => {
    const prompt = build();
    for (const criterion of template.rubric) {
      expect(prompt).not.toContain(criterion.score1);
      expect(prompt).not.toContain(criterion.score5);
    }
  });

  it('sends only the first name', () => {
    const prompt = build();
    expect(prompt).toContain('Anna');
    expect(prompt).not.toContain('Nowak');
  });

  it('starts with a greeting on a fresh call', () => {
    const prompt = build();
    expect(prompt).toContain('# Start of the call');
    expect(prompt).not.toContain('# Reconnected call');
    expect(prompt).toMatch(/Say one opening turn only/);
    expect(prompt).toMatch(/introduce yourself \(name, role, company\)/);
  });

  it('continues from the transcript on resume', () => {
    const prompt = build({
      resume: {
        elapsedMs: 245_000,
        turns: [
          { speaker: 'AI', text: 'Hi Anna, tell me about your last project.' },
          { speaker: 'CANDIDATE', text: 'I built a Kafka based ledger service.' },
        ],
      },
    });
    expect(prompt).toContain('# Reconnected call');
    expect(prompt).toContain('4:05');
    expect(prompt).toContain('You (client): Hi Anna, tell me about your last project.');
    expect(prompt).toContain('Candidate: I built a Kafka based ledger service.');
    expect(prompt).not.toContain('# Start of the call');
  });
});

describe('buildTimeCues', () => {
  const cues = buildTimeCues(template);

  it('is sorted and stays within the hard limit', () => {
    const offsets = cues.map((c) => c.atMs);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    expect(offsets.every((o) => o > 0 && o < SESSION_HARD_LIMIT_MS)).toBe(true);
  });

  it('marks the first transition, then the wrap-up and the goodbye', () => {
    // Offsets follow the shared timing constants, which changed after this version was released.
    const offsets = cues.map((c) => c.atMs);
    expect(offsets).toContain(template.phases[0]!.targetDurationSec * 1000);
    expect(offsets).toContain(WRAP_UP_AT_MS);
    expect(offsets.at(-1)).toBe(SESSION_HARD_LIMIT_MS - 15_000);
  });
});

describe('speaking pace', () => {
  it('offers the pace tool and tells the client when to call it', () => {
    const [tool] = buildTools();
    expect(tool?.name).toBe(SPEAKING_PACE_TOOL);
    expect(tool?.parameters).toMatchObject({
      properties: { pace: { enum: ['normal', 'slower'] } },
    });
    expect(build()).toContain(`call the ${SPEAKING_PACE_TOOL} tool with "slower"`);
  });

  it('has a private note for each pace', () => {
    const notes = buildPaceNotes();
    expect(notes.slower).toMatch(/do not mention it.*slower pace/);
    expect(notes.normal).toMatch(/do not mention it.*normal pace/);
  });
});

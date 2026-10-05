import { getRoleTemplate, SESSION_HARD_LIMIT_MS, type RoleTemplate } from '@clientready/shared';
import { describe, expect, it } from 'vitest';
import {
  buildClientInstructions,
  buildResumeNote,
  buildTimeCues,
  CLIENT_PROMPT_VERSION,
} from './v6';

const template = getRoleTemplate('backend-developer') as RoleTemplate;

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
    expect(CLIENT_PROMPT_VERSION).toBe('client-v6');
  });

  it('includes the persona', () => {
    const prompt = build();
    for (const value of Object.values(template.persona).filter((v) => typeof v === 'string')) {
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
    expect(prompt).toMatch(/React only when the candidate actually says words in another language/);
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

  it('marks each phase transition and the wrap-up', () => {
    expect(cues.map((c) => c.atMs)).toEqual([
      120_000, 240_000, 390_000, 510_000, 630_000, 660_000, 705_000,
    ]);
    expect(cues[0]?.text).toMatch(/you have reacted to what they said/);
    expect(cues[2]?.text).toContain('Client situation');
    expect(cues[1]?.text).toMatch(/still in "Project deep-dive" - about 3 more minutes/);
    expect(cues[1]?.text).toMatch(/different aspect of the same topic/);
    expect(cues[3]?.text).toMatch(/the situation you already raised/);
    for (const cue of cues) {
      expect(cue.text).toMatch(/do not mention it/);
      expect(cue.text).not.toMatch(/phase \d/i);
    }
    expect(cues[5]?.text).toMatch(/quick question/);
    expect(cues[6]?.text).toMatch(/goodbye/);
  });
});

describe('v5 changes (first production test)', () => {
  it('has no speed tool; slowing down is just calmer, simpler speech', () => {
    const prompt = build();
    expect(prompt).not.toMatch(/set_speaking_pace|tool/);
    expect(prompt).toMatch(/speak more slowly and calmly/);
  });

  it('reacts only to another language, not to talk about Poland', () => {
    const prompt = build();
    expect(prompt).toMatch(/only about the language the candidate speaks/);
    expect(prompt).not.toContain('Ładna dziś pogoda');
  });

  it('continues a turn cut off by a short noise', () => {
    expect(build()).toMatch(/cut off by a short noise.*continue from where you stopped/);
  });

  it('has a private note for when the audio is back', () => {
    expect(buildResumeNote()).toMatch(/do not mention it.*interrupted.*continue/);
  });
});

describe('v6 changes (second production test)', () => {
  it('pushes back without handing over the solution', () => {
    const prompt = build();
    expect(prompt).toMatch(/Never give the answer or the solution yourself/);
    expect(prompt).toMatch(/no solution handed over in a pushback/);
  });

  it('lists the judging reactions seen in the test', () => {
    const prompt = build();
    expect(prompt).toContain("that's a solid anchor");
    expect(prompt).toContain("that's honest, which I appreciate");
  });
});

import { describe, expect, it } from 'vitest';
import { checkAiTurn, summarise } from './metrics';

describe('checkAiTurn', () => {
  it('flags a client turn that ignores the candidate’s question', () => {
    const asked = 'Before that, can I ask how big your team is?';
    expect(
      checkAiTurn('Okay. What was the hardest part of that project?', 0, asked).flags,
    ).toContain('ignored-question');
    expect(
      checkAiTurn(
        'Sure, we are eight people and two of them work remotely. How big was your last team?',
        0,
        asked,
      ).flags,
    ).not.toContain('ignored-question');
    // No question from the candidate: nothing to ignore.
    expect(checkAiTurn('Okay. Why?', 0, 'I used Kafka.').flags).not.toContain('ignored-question');
  });

  it('passes a short single-question turn', () => {
    expect(checkAiTurn('Got it. Why did you pick Kafka there?', 0).flags).toEqual([]);
  });

  it('flags the problems seen in a real run', () => {
    // Taken from a real conversation with client-v1.
    const leak = checkAiTurn(
      "I can't tell you the timeframe, the countries, or any risk limits, and that's your job to clarify. What's your first question to me?",
      0,
    );
    expect(leak.flags).toContain('reveals-assessment');

    const options = checkAiTurn(
      'Can you give me one concrete example? For example, did you optimize some routing, improve latency, or handle retries?',
      1,
    );
    expect(options.flags).toEqual(expect.arrayContaining(['multi-question', 'suggests-answers']));

    expect(checkAiTurn("Okay, that's a reasonable start. What's next?", 2).flags).toContain(
      'evaluative-praise',
    );
    expect(checkAiTurn('Dobrze, rozumiem. Let us continue.', 3).flags).toContain('non-english');
    // Judging tucked into the reaction (client-v4 drafts).
    expect(checkAiTurn("Okay. That's a sensible first move. What next?", 4).flags).toContain(
      'evaluative-praise',
    );
    expect(checkAiTurn('Right. The outbox is a solid way to close it. Why?', 5).flags).toContain(
      'evaluative-praise',
    );
    expect(checkAiTurn('Ouch. That sounds painful. What happened?', 6).flags).toEqual([]);
  });

  it('flags reading out stage directions and other patterns seen in simulations', () => {
    expect(
      checkAiTurn("Alright, let's move into phase 2. Pick one recent project?", 0).flags,
    ).toContain('meta-narration');
    expect(
      checkAiTurn("I'm going to keep the details vague on purpose. What do you do first?", 0).flags,
    ).toContain('meta-narration');
    expect(
      checkAiTurn('What would you do—walk away, throttle, or introduce extra checks?', 0).flags,
    ).toContain('suggests-answers');
    expect(checkAiTurn("That's a great example, thanks. I like that.", 0).flags).toContain(
      'evaluative-praise',
    );
  });

  it('flags long turns', () => {
    expect(checkAiTurn(`${'word '.repeat(60)}?`, 0).flags).toContain('too-long');
  });

  it('does not flag an ordinary "or" question', () => {
    expect(checkAiTurn('Did you own that part or was it another team?', 0).flags).toEqual([]);
  });
});

describe('summarise', () => {
  it('aggregates counts and averages', () => {
    const metrics = summarise([checkAiTurn('One question?', 0), checkAiTurn('First? Second?', 1)]);
    expect(metrics).toMatchObject({
      aiTurns: 2,
      avgWords: 2,
      maxWords: 2,
      multiQuestionShare: 0.5,
    });
    expect(metrics.flagCounts['multi-question']).toBe(1);
  });
});

describe('compound questions and options behind a single question mark', () => {
  it('flags them', () => {
    const turn = checkAiTurn(
      'For that project, what was the architecture you worked in—were there multiple services or mostly a single backend—and did you own a specific module or end-to-end flow?',
      0,
    );
    expect(turn.flags).toEqual(expect.arrayContaining(['compound-question', 'suggests-answers']));
    expect(
      checkAiTurn("I've got a scenario for you—imagine a payout is delayed.", 0).flags,
    ).toContain('meta-narration');
  });
});

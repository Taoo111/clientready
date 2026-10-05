/**
 * Automatic checks of the AI client's turns against the guardrails. Heuristics, meant to
 * compare prompt versions on simulated conversations — not a substitute for listening.
 */

export interface AiTurnCheck {
  index: number;
  text: string;
  words: number;
  questions: number;
  flags: AiTurnFlag[];
}

export const AI_TURN_FLAGS = [
  'multi-question',
  'compound-question',
  'too-long',
  'reveals-assessment',
  'meta-narration',
  'suggests-answers',
  'evaluative-praise',
  'non-english',
  'ignored-question',
] as const;
export type AiTurnFlag = (typeof AI_TURN_FLAGS)[number];

/** Turns longer than this are unlikely to be "1–2 short sentences". */
export const MAX_TURN_WORDS = 45;

const PATTERNS: Partial<Record<AiTurnFlag, RegExp>> = {
  // Telling the candidate what is being checked or what they should do.
  'reveals-assessment':
    /\b(clarify(ing)? questions?|your job (is|to)|i('m| am) expecting you|what (would|should) you ask|i('m| am) (testing|assessing|evaluating)|this (test|exercise|assessment)|scor(e|ing)|evaluat\w*|assess\w*)\b/i,
  // Reading out its own stage directions ("phase 2", "on purpose", "I'll push back").
  'meta-narration':
    /\b(phase \d|part \d|next phase|on purpose|to make it (more )?real|(a|one) (small )?complication|scenario|imagine (that )?you|role[- ]?play|i('ll| will) (push back|ask you for|have a final)|once you answer|stay in character)\b/i,
  // Judging the candidate's answer instead of reacting like a client.
  'evaluative-praise':
    /\b(great|good|solid|excellent|perfect|reasonable|strong|nice|sensible|measured|smart) (answer|approach|start|point|job|response|question|example|plan|path|nuance|thinking|escalation)\b|\bwell (said|done|answered)\b|\bthanks for asking\b|\bi (really )?like (that|the|your)\b|\b(that|this)(['’]s| is| was| sounds like) an? (very |really )?(good|great|solid|sensible|clear|clean|calm|smart|practical|thoughtful|reasonable)\b|\bis an? (good|solid|sensible|smart) (way|move|call|choice)\b/i,
  'non-english': /[ąćęłńśźżĄĆĘŁŃŚŹŻ]|\b(dziękuję|proszę|dobrze|nie wiem)\b/i,
};

const questionSentences = (text: string) => text.match(/[^.?!]*\?/g) ?? [];

/** A question that hands over options ("A, B or C?", "—like X or Y—") or example answers. */
function suggestsAnswers(text: string): boolean {
  return questionSentences(text).some(
    (q) =>
      /,[^?]*\bor\b/i.test(q) ||
      /[—–][^—–?]*\bor\b[^—–?]*[—–]/.test(q) ||
      /\b(for example|for instance|e\.g\.|such as|like a|like maybe)\b/i.test(q),
  );
}

const QUESTION_START =
  '(did|do|does|what|how|why|who|when|which|is|are|was|were|can|could|would|should|have|has)';

/** Two questions in one sentence: "What was X—…—and did you Y?" */
function compoundQuestion(text: string): boolean {
  const pattern = new RegExp(`(,|[—–])\\s*(and|also)\\s+${QUESTION_START}\\b`, 'i');
  return questionSentences(text).some((q) => pattern.test(q));
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * The candidate asked something, but the client only reacted with a word or two and asked its
 * own question (client-v3 did this all the time). Asking the candidate to repeat is flagged
 * too - read the turn.
 */
function ignoresQuestion(text: string, previousCandidateText: string | undefined): boolean {
  if (!previousCandidateText?.includes('?')) return false;
  const statements = text.replace(/[^.?!]*\?/g, ' ');
  return countWords(statements) < 5;
}

export function checkAiTurn(
  text: string,
  index: number,
  previousCandidateText?: string,
): AiTurnCheck {
  const questions = (text.match(/\?/g) ?? []).length;
  const words = countWords(text);
  const flags: AiTurnFlag[] = [];
  if (questions > 1) flags.push('multi-question');
  if (compoundQuestion(text)) flags.push('compound-question');
  if (words > MAX_TURN_WORDS) flags.push('too-long');
  if (suggestsAnswers(text)) flags.push('suggests-answers');
  if (ignoresQuestion(text, previousCandidateText)) flags.push('ignored-question');
  for (const flag of AI_TURN_FLAGS) {
    if (PATTERNS[flag]?.test(text)) flags.push(flag);
  }
  return { index, text, words, questions, flags };
}

export interface SimulationMetrics {
  aiTurns: number;
  avgWords: number;
  maxWords: number;
  multiQuestionShare: number;
  flagCounts: Record<AiTurnFlag, number>;
}

export function summarise(checks: readonly AiTurnCheck[]): SimulationMetrics {
  const flagCounts = Object.fromEntries(AI_TURN_FLAGS.map((f) => [f, 0])) as Record<
    AiTurnFlag,
    number
  >;
  for (const check of checks) for (const flag of check.flags) flagCounts[flag]++;
  const words = checks.map((c) => c.words);
  return {
    aiTurns: checks.length,
    avgWords: words.length ? Math.round(words.reduce((a, b) => a + b, 0) / words.length) : 0,
    maxWords: words.length ? Math.max(...words) : 0,
    multiQuestionShare: checks.length
      ? checks.filter(
          (c) => c.flags.includes('multi-question') || c.flags.includes('compound-question'),
        ).length / checks.length
      : 0,
    flagCounts,
  };
}

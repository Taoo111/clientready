# Prompts

Versioned prompt files. Each conversation stores the client prompt version it ran with
(`Assessment.promptVersion`); each report stores its provider, model and evaluation
`promptVersion` (`Report`).

| File               | Version         | Used for                                                                               |
| ------------------ | --------------- | -------------------------------------------------------------------------------------- |
| `client/v1.ts`     | `client-v1`     | AI client instructions + time cues (first pilot run)                                   |
| `client/v2.ts`     | `client-v2`     | v1 + no spoken preambles, single opening turn                                          |
| `client/v3.ts`     | `client-v3`     | M5 tuning: turn shape (1 question, ~30 words), private instructions, pacing notes      |
| `client/v4.ts`     | `client-v4`     | Current. Tester feedback: reacts first (answers questions, off-script moments), warmer |
| `evaluation/v1.ts` | `evaluation-v1` | Evaluation system prompt, user message and output schema (zod)                         |
| `evaluation/v2.ts` | `evaluation-v2` | Current. v1 + fair listening/clarifying rules learned from a real run                  |

The client version used for real conversations is `currentClientPrompt` in `client/index.ts`;
all versions are registered there so the simulator can compare them.

Rules:

- Client instructions are built **only on the server** from the role template, target level and
  the guardrails in CLAUDE.md. The browser receives just an ephemeral client secret and time cues.
- The evaluation prompt and schema are provider-independent: OpenAI and Anthropic get exactly the
  same text and schema.
- Do not edit the text of a version once it has been used for real conversations or reports.
  Copy it to a new file, bump the version string and switch `currentClientPrompt` (client) or
  the re-export in `evaluation/index.ts` (evaluation).

## Tuning workflow

1. Look at real transcripts (panel → report → transcript) and note what the AI client does wrong.
2. Reproduce it with the simulator — same realtime model and prompt, text instead of audio, a
   scripted candidate persona and the same time notes as the browser:
   `pnpm simulate --role business-analyst --persona medium --prompt client-v4 [--runs 3] [--evaluate]`
   Personas: `strong`, `medium`, `weak`, `polish` (switches to Polish), `probing` (asks about
   scoring, whether it is an AI, for tips). Reports go to `simulations/` (gitignored) with
   automatic checks of every client turn: multiple/compound questions, length, suggested answers,
   praise, meta-narration ("phase 2", "on purpose"), revealing the assessment, non-English.
3. Change the prompt in a new version, compare the numbers and read the transcripts.
4. For the evaluation prompt, run `pnpm test:eval` (fixtures for every role) and re-run real
   conversations from the report page ("Oceń ponownie") to compare reports.

Note: simulations use the realtime model in text mode — close to, but not the same as, a voice
call. Always confirm a new client prompt with a real voice test.

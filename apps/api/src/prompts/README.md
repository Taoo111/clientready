# Prompts

Versioned prompt files. Each conversation stores the client prompt version it ran with
(`Assessment.promptVersion`); each report stores its provider, model and evaluation
`promptVersion` (`Report`).

| File               | Version         | Used for                                                                |
| ------------------ | --------------- | ----------------------------------------------------------------------- |
| `client/v1.ts`     | `client-v1`     | AI client instructions + time cues (first pilot runs)                   |
| `client/v2.ts`     | `client-v2`     | Current. v1 + no spoken preambles, single opening turn                  |
| `evaluation/v1.ts` | `evaluation-v1` | Current. Evaluation system prompt, user message and output schema (zod) |

Rules:

- Client instructions are built **only on the server** from the role template, target level and
  the guardrails in CLAUDE.md. The browser receives just an ephemeral client secret and time cues.
- The evaluation prompt and schema are provider-independent: OpenAI and Anthropic get exactly the
  same text and schema.
- Do not edit the text of a released version. Copy it to a new file (e.g. `client/v3.ts`), bump
  the version string and switch the import (`public/public-assessments.service.ts` for the
  client prompt, `evaluation/evaluate.ts` for the evaluation prompt). Re-run `pnpm test:eval`
  after changing the evaluation prompt.

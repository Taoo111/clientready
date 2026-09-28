# Prompts

Versioned prompt files. Each conversation stores the client prompt version it ran with
(`Assessment.promptVersion`); each report will store its evaluation `promptVersion` (M3).

| File           | Version     | Used for                                                              |
| -------------- | ----------- | --------------------------------------------------------------------- |
| `client/v1.ts` | `client-v1` | AI client instructions + time cues for the live realtime conversation |

Rules:

- Instructions are built **only on the server** from the role template, target level and the
  guardrails in CLAUDE.md. The browser receives just an ephemeral client secret and time cues.
- Do not edit the text of a released version. Copy it to a new file (`client/v2.ts`), bump the
  version string and switch the import in `realtime/realtime-session.service.ts`.

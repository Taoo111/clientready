# ClientReady

AI voice assessment that checks whether a candidate can handle a real conversation with a client in English — not just general English level. Target market: IT body leasing / contracting companies and software houses. First pilot customer: Euvic HR (recruitment of developers, BA, QA, PM, etc.).

This is the founder's own product (not built for or owned by any employer). Keep all code, names and config free of any customer branding.

## How it works (MVP)

1. Recruiter creates an assessment in the panel: picks a **role template** (backend, BA, …) and target level, gets a unique link for the candidate.
2. Candidate opens the link in a browser (no install):
   - consent screen: clearly states they will talk to an AI and that the session is recorded; explicit consent checkbox,
   - microphone check,
   - 10–12 min live **voice** conversation with an AI playing the client. Phases: warm-up → project deep-dive with follow-ups → client situation (ambiguous requirement / prod incident / estimate pushback),
   - end screen.
3. After the session, a separate **evaluation** step scores the transcript with a fixed rubric and produces a report for the recruiter:
   - CEFR estimate (speaking, listening),
   - 4–5 client-readiness criteria scored 1–5, each with **evidence quotes** from the transcript,
   - recommendation: `READY` / `READY_WITH_CONCERNS` / `NOT_READY` + short summary,
   - transcript (+ audio recording) for verification.

The test is used **before** the technical interview, as a screening step. The AI only recommends — a human always makes the decision (EU AI Act: recruitment AI is high-risk; design for human oversight, logging and transparency from day one).

Volume at the pilot customer: a few to a dozen+ candidates per month. Optimize for quality and speed of iteration, not scale.

## Stack (decided)

- **Monorepo**: pnpm workspaces
  - `apps/api` — NestJS (TypeScript), REST
  - `apps/web` — Next.js (App Router, TypeScript), candidate flow + recruiter panel
  - `packages/shared` — shared types, zod schemas, **role templates**
- **DB**: PostgreSQL + Prisma. Local dev via `docker-compose` (Postgres only).
- **Live conversation**: OpenAI Realtime API over WebRTC, directly from the browser. The backend mints a short-lived ephemeral client secret per session; the real API key never reaches the browser. Start with the mini realtime model; make the model configurable via env. Always check current OpenAI Realtime docs before implementing — the API changes often.
- **Transcription**: use the realtime session's input audio transcription events; the browser streams transcript turns to the API, which persists them per session.
- **Audio recording**: browser `MediaRecorder` (candidate + AI mixed if feasible, otherwise candidate only), uploaded after the session. MVP storage: local disk behind a storage interface; S3-compatible (EU region) later.
- **Evaluation**: Anthropic API, model `claude-sonnet-5` (configurable via env), structured JSON output validated with zod against the report schema. Evaluation is a separate step from the conversation so it is consistent and can be re-run/calibrated.
- **Languages**: candidate-facing UI and conversation in English; recruiter panel and reports in Polish (keep strings centralized so i18n is easy later).
- **Config**: all secrets via `.env` (commit `.env.example` only).

## Role templates

Stored in `packages/shared/roles/*.ts` (typed objects, validated with zod). Adding a role must require **no code changes** beyond adding a template. Each template contains:

- `id`, `name`, `description`
- `persona` — who the AI client is (company, product, personality, how demanding)
- `phases` — ordered list with goal, suggested questions, follow-up guidance, target duration
- `rubric` — criteria with key, name, what 1/3/5 looks like
- `levels` — how difficulty changes for B1 / B2 / C1 target

MVP templates: **backend developer** and **business analyst** (deliberately different, to show HR it's not dev-only).

Default criteria (can be overridden per role): understanding questions, technical/domain vocabulary precision, asking clarifying questions, handling pressure/disagreement, fluency & coherence.

## Data model (initial)

- `Assessment` — id, roleTemplateId, targetLevel, candidateName, candidateEmail (optional), token (unguessable), status (`CREATED` → `IN_PROGRESS` → `COMPLETED` → `EVALUATED` / `FAILED`), consentAt, startedAt, endedAt, createdAt
- `TranscriptTurn` — assessmentId, speaker (`AI` | `CANDIDATE`), text, startedAtMs, seq
- `Recording` — assessmentId, storageKey, durationMs, mimeType
- `Report` — assessmentId, json (validated report), model, promptVersion, createdAt
- `Recruiter` — minimal auth for the panel (MVP: seeded admin user, email + password, session cookie)

Keep a data retention setting (env, default 90 days) and a job/command that purges old recordings and transcripts.

## Guardrails for the AI client (system prompt)

- Stay in character as the client; never reveal scoring or that it is evaluating.
- One question at a time, natural pace, follow up on vague answers.
- Respect phase timing; wrap up politely at ~11 min. The client also hard-stops the session at 12 min.
- Never switch to Polish, even if the candidate does; say "Let's continue in English" once.
- No questions about protected characteristics or personal life.

## Milestones

1. **Scaffold** — monorepo, NestJS + Next.js running, Prisma + docker-compose Postgres, lint/format, `.env.example`, README with how to run.
2. **Conversation** — create assessment (API), candidate link flow (consent → mic check → live realtime conversation with backend template), transcript persisted, session end + hard stop.
3. **Evaluation & report** — evaluation service with Claude + zod schema, report page (Polish) with scores, evidence quotes, recommendation, transcript, audio player.
4. **Recruiter panel** — login, list of assessments with status, create assessment + copy link, view report.
5. **BA template** + prompt tuning on real test runs.
6. **Deploy** — EU hosting, HTTPS, storage on S3-compatible EU bucket.

Goal of milestones 1–5: a working demo HR can try themselves (they play the candidate and read their own report).

## Out of scope for MVP

ATS integrations (pilot customer uses Recruitify; its API is only on their Enterprise plan — later: PDF export / email report, then integration), billing, multi-tenant orgs, anti-cheating beyond the live voice format, pronunciation scoring APIs, mobile apps.

## Conventions

- TypeScript strict everywhere; zod at every boundary (HTTP input, AI output).
- Prompts live in versioned files (`apps/api/src/prompts/`), with a `promptVersion` stored on each report.
- Small, focused commits with clear messages. Keep the README run instructions up to date.
- Windows dev machine: scripts must work in PowerShell (avoid bash-only npm scripts).

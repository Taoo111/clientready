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
- **DB**: PostgreSQL + Prisma. Local dev via `docker-compose` (Postgres only); production: Supabase (Frankfurt) through the session pooler.
- **Live conversation**: OpenAI Realtime API over WebRTC, directly from the browser. The backend mints a short-lived ephemeral client secret per session; the real API key never reaches the browser. Model configurable via env: development uses `gpt-realtime-2.1-mini` (cheaper), production `gpt-realtime-2.1` (the code default) — M5 simulations showed the mini model ignoring the one-question/turn-length rules in ~35–40% of turns (vs ~4%), which also distorted the evaluation. Reasoning effort `minimal` (no spoken preambles). Always check current OpenAI Realtime docs before implementing — the API changes often.
- **Transcription**: use the realtime session's input audio transcription events; the browser streams transcript turns to the API, which persists them per session.
- **Audio recording**: browser `MediaRecorder` (candidate + AI mixed if feasible, otherwise candidate only), uploaded after the session. Storage interface: local disk in development, private Supabase Storage bucket in production (short-lived signed URLs for playback).
- **Evaluation**: provider-independent. An `EvaluationProvider` interface with two implementations — **OpenAI** (default; Responses API + Structured Outputs, mid-tier model `gpt-6-sol`) and **Anthropic** (`claude-sonnet-5`, `output_config.format`). Selected by env `EVAL_PROVIDER` (`openai` | `anthropic`) and `EVAL_MODEL` (empty = provider default). Both use the same versioned prompt, rubric and zod output schema; every report stores provider + model + promptVersion. Evidence quotes are verified in code against the transcript. The recommendation is computed by a fixed rule relative to the target level (the model's suggestion is kept for calibration). Evaluation is a separate step from the conversation so it is consistent and can be re-run/calibrated. Always check current provider docs before changing models or request shapes.
- **Languages**: candidate-facing UI and conversation in English; recruiter panel and reports in Polish (keep strings centralized so i18n is easy later).
- **Config**: all secrets via `.env` (commit `.env.example` only); in production via the Render / Vercel dashboards.
- **Deploy (demo, zero cost)**: web on Vercel Hobby (region fra1, root `apps/web`, `vercel.json`); API on Render free web service in Frankfurt from `apps/api/Dockerfile` (`render.yaml` blueprint, runs `prisma migrate deploy` on start); database and recordings on Supabase free (Frankfurt). Free-tier consequences designed for: Render sleeps after 15 min idle (the web wakes it via `/health` on the login and candidate screens with a friendly waiting state and keeps it awake while a candidate page is open; the panel shows a wake-up screen instead of failing); the Render disk is ephemeral (nothing is stored locally); the in-memory evaluation queue resumes COMPLETED sessions on start. Candidate calls go from the browser straight to the API (CORS for the Vercel origin, no cookies); the recruiter panel calls the API only server-side, so the session cookie stays first-party on the Vercel domain (no cross-site cookies, no 4.5 MB Vercel body limit for recordings).

## Design

- **Stack**: Tailwind CSS v4 + shadcn/ui (Radix base, `apps/web/src/components/ui`, generated by the shadcn CLI — edit freely) + lucide-react icons. Fonts: Geist / Geist Mono via `next/font`.
- **Direction**: calm, professional B2B product that inspires trust — not a template. Warm off-white page (`--background`), white cards with subtle borders and soft shadows, one strong accent (**deep teal**, `--brand`), lots of whitespace, restrained typography (semibold headings, muted secondary text).
- **Tokens**: all colours (OKLCH), radius and shadows are CSS variables in `apps/web/src/app/globals.css`. Rebrand by changing `--brand*` (and optionally surfaces); status colours `--success/--warning/--danger/--info` (+ `-soft`) are used for badges, recommendations and notices. Light theme only for now.
- **Brand**: working name ClientReady; text logotype with "Ready" in the accent colour + mark = speech bubble with a check (`components/brand/logo.tsx`). No third-party logos.
- **States**: every async view has a skeleton, every list an empty state with a next step, errors use `Notice` with an icon and a concrete instruction; focus rings use `--ring` (brand); buttons show a spinner while pending.
- **Layout**: mobile-first, works from 360 px. Candidate flow: single centred column, one task per screen, reassuring tone (it should not feel like an exam). Recruiter panel: top bar + content up to ~72rem.
- **Print**: the report has a print stylesheet (`print:` utilities, `.print-hidden`) so "Drukuj / PDF" produces a clean A4 PDF for the ATS.
- **Client presence (conversation screen)**: the AI client is shown as a name card from the role template (`persona.card`: name, title, company) with a monogram portrait — deliberately not a photo-realistic face — and an always-visible **AI** badge (transparency, EU AI Act art. 50). States: listening / thinking (between the candidate's turn and the reply) / speaking, plus "you're speaking" and a segmented progress bar of the conversation parts. A video avatar was researched (Anam, HeyGen LiveAvatar, Simli) and postponed: ~1 s extra latency per reply, more moving parts, possible uncanny-valley stress.
- **White-label for customer demos**: `NEXT_PUBLIC_CUSTOMER_NAME`, `NEXT_PUBLIC_CUSTOMER_LOGO_URL`, `NEXT_PUBLIC_BRAND_COLOR` (set on the hosting platform only). Candidates then see the customer's name/logo with "Powered by ClientReady"; the panel shows "dla <customer>"; one colour drives all brand shades. Never commit a customer's name, logo or colours to the repository.
- `/design` (development only) shows tokens and components.

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
- `Report` — assessmentId, json (validated report), provider, model, promptVersion, createdAt (several per assessment: re-runs keep history, newest is current)
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
6. **Deploy** — Vercel (web) + Render (API) + Supabase (DB, recordings), all in the EU; HTTPS by the platforms. See README → Deploy.
   Known before deploy (found in M5): the OpenAI account's realtime rate limit (tokens/min) is low at the current usage tier — simulations hit it, and parallel live calls could too; raise the tier/limit. The browser retries rate-limited responses a few times.

Goal of milestones 1–5: a working demo HR can try themselves (they play the candidate and read their own report).

## Out of scope for MVP

ATS integrations (pilot customer uses Recruitify; its API is only on their Enterprise plan — later: PDF export / email report, then integration), billing, multi-tenant orgs, anti-cheating beyond the live voice format, pronunciation scoring APIs, mobile apps.

## Engineering principles

The goal is code a newcomer can follow in one read. Prefer the obvious solution over the clever one.

- **One responsibility per unit** (SRP). A controller/page handles transport and rendering; a service runs a use case; pure functions hold the rules. If you need "and" to describe a file, split it. ESLint enforces a hard limit of 300 lines per file (tests, prompts, role templates and `components/ui` excluded) - split by responsibility, never raise the limit.
- **Pure core, thin shell.** Business rules (timing, status transitions, recommendation, quote verification, DTO mapping, transcript bookkeeping) are plain functions/classes without Nest, React, Prisma or `fetch`, so they are unit-tested directly and reusable from CLI scripts.
- **Depend on abstractions at the edges** (DIP). External services sit behind an abstract class used as the DI token: `EvaluationProvider`, `RealtimeSecretProvider`, `Storage`, `Clock`. Adding a provider = a new implementation + one line in the factory (OCP); callers do not change. Tests swap them for fakes.
- **Features, not layers.** Code is grouped by feature (assessments, conversation, recordings, evaluation, ...). A feature may use another feature only through what its module exports; no cycles. Shared plumbing lives in `infra/` (API) or `lib/` (web).
- **Validate at boundaries, trust inside.** zod on HTTP input, API responses in the web app, AI output and env. Inside, rely on the types.
- **Errors**: services throw domain errors (`UnknownRoleTemplateError`, `EvaluationNotPossibleError`, `PublicError` codes for the candidate); controllers map them to HTTP. Never swallow an error silently - log it with the assessment id or return an explicit null/boolean that the caller handles.
- **No speculative abstraction.** No interface with a single implementation unless it is an external service boundary; no generic helpers "for later"; three similar lines beat a premature utility. Delete dead code.
- **Naming**: files kebab-case (`assessments.service.ts`, `live-step.tsx`); classes/components PascalCase; one exported concept per file, named after the file. Names say what, comments say why (only when the why is not obvious).
- **Tests**: every rule and mapper gets a unit test next to it (`*.test.ts`); every endpoint behaviour an e2e test (`apps/api/test`). Bug fix = failing test first.

## Code map

- `packages/shared` - contracts both apps rely on: `src/api/{admin,candidate,report,auth}.ts` (zod schemas + types per audience), `src/enums.ts`, `src/roles/schema.ts`, role templates in `roles/*.ts`.
- `apps/api/src` - one folder per feature (see `apps/api/CLAUDE.md`): `assessments/` (recruiter CRUD + lifecycle rules), `conversation/` (candidate flow by token, realtime secrets), `recordings/`, `evaluation/` (scheduler, evaluate pipeline, `providers/`), `auth/`, `retention/`, `health/`; `infra/` (Prisma, storage, clock, HTTP helpers); `prompts/` (versioned); `cli/` + `simulation/` (dev tools).
- `apps/web/src` - see `apps/web/CLAUDE.md`: `app/` (routes, thin), `components/{candidate,admin,admin/report,brand,common,ui}`, `lib/` (API clients, realtime, audio, formatting), `i18n/` (all strings).

## Conventions

- TypeScript strict everywhere; zod at every boundary (HTTP input, AI output).
- Prompts live in versioned files (`apps/api/src/prompts/`), with a `promptVersion` stored on each report.
- Small, focused commits with clear messages. Keep the README run instructions up to date.
- Windows dev machine: scripts must work in PowerShell (avoid bash-only npm scripts).
- Before every commit: `pnpm verify` (format check, lint, typecheck, unit tests) and, when the API changed, `pnpm test:e2e`. The `/verify` skill runs the full set.

## AI tooling (Claude Code)

- Instructions: this file (product, principles) + `apps/api/CLAUDE.md` and `apps/web/CLAUDE.md` (per-app structure and patterns). `apps/web/AGENTS.md` is generated by Next.js - do not edit it.
- `.claude/settings.json` (committed): allowed quality commands, `ask` for pushes and paid AI runs (`test:eval`, `simulate`), reading `.env*` secrets denied; a PostToolUse hook formats every edited file with Prettier (`.claude/hooks/format-file.mjs`). Personal overrides go to `.claude/settings.local.json` (gitignored).
- Skills: `/verify` (`.claude/skills/verify`).

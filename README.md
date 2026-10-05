# ClientReady

AI voice assessment that checks whether a candidate can handle a real conversation with a client in English. See [CLAUDE.md](CLAUDE.md) for the product and technical overview.

## Repository layout

```
apps/api          NestJS REST API (Prisma + PostgreSQL), one folder per feature
apps/web          Next.js (App Router) — candidate flow + recruiter panel
packages/shared   Shared types, zod schemas, role templates (packages/shared/roles/*.ts)
docker-compose.yml  Local PostgreSQL
.claude/          Claude Code project settings, Prettier hook, /verify skill
```

Code structure and engineering principles: CLAUDE.md ("Engineering principles", "Code map") and
`apps/api/CLAUDE.md`, `apps/web/CLAUDE.md`.

## Prerequisites

- Node.js 22.12+ (`node -v`)
- pnpm 10 — `corepack enable` (the version is pinned in `package.json`)
- Docker Desktop (for the local PostgreSQL)

## First run (Windows / PowerShell)

Run from the repository root:

```powershell
Copy-Item .env.example .env     # then fill in secrets (OPENAI_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD)
pnpm install                    # also generates the Prisma client
pnpm db:up                      # start PostgreSQL in Docker (host port 5433)
pnpm db:migrate                 # apply Prisma migrations
pnpm dev                        # start shared (watch), api and web
```

Then open:

- Recruiter panel: http://localhost:3000/admin — log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`
- API health check: http://localhost:3001/health — should return `{"status":"ok","db":"ok"}`

Stop the dev servers with `Ctrl+C`; stop the database with `pnpm db:down` (data is kept in a Docker volume).

## Scripts (root)

| Command                              | What it does                                                         |
| ------------------------------------ | -------------------------------------------------------------------- |
| `pnpm dev`                           | Build `shared`, then run all packages in watch/dev mode              |
| `pnpm build`                         | Production build of all packages                                     |
| `pnpm typecheck`                     | TypeScript check across the workspace                                |
| `pnpm lint` / `pnpm lint:fix`        | ESLint                                                               |
| `pnpm format` / `pnpm format:check`  | Prettier                                                             |
| `pnpm verify`                        | Format check + lint + typecheck + unit tests (run before committing) |
| `pnpm db:up` / `pnpm db:down`        | Start / stop PostgreSQL (docker compose)                             |
| `pnpm db:migrate`                    | Create/apply migrations in development (`prisma migrate dev`)        |
| `pnpm db:generate`                   | Regenerate the Prisma client (`apps/api/src/generated`, gitignored)  |
| `pnpm db:studio`                     | Open Prisma Studio                                                   |
| `pnpm test`                          | Unit tests (role templates, prompts, evaluation rules, storage)      |
| `pnpm test:e2e`                      | API end-to-end tests (needs `pnpm db:up`)                            |
| `pnpm test:ui`                       | Browser tests (Playwright) of the candidate flow and the panel       |
| `pnpm test:eval`                     | Live evaluation of the fixture transcripts (real provider, costs ¢)  |
| `pnpm simulate --role … --persona …` | Simulated AI-client conversation for prompt tuning (costs ¢)         |
| `pnpm create-assessment --name "…"`  | Create an assessment; prints the candidate link and report link      |
| `pnpm purge-data [--dry-run]`        | Delete assessments older than `DATA_RETENTION_DAYS`                  |
| `pnpm usage-report [--days 30]`      | Estimated AI cost per assessment from the recorded token usage       |

## Configuration

All configuration lives in a single `.env` at the repository root (see `.env.example`). The API validates it with zod at startup and refuses to start on invalid values. The web app reads the same file (`next.config.ts`). Never commit `.env`.

If port 5433 is taken, change `POSTGRES_PORT` and the port in `DATABASE_URL` in `.env`.

| Variable                                                          | Purpose                                                                                                                                                  |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`                                                  | Server-side only; used to mint short-lived realtime client secrets                                                                                       |
| `OPENAI_REALTIME_MODEL`                                           | Realtime model: `gpt-realtime-2.1-mini` in development (`.env.example`), `gpt-realtime-2.1` in production (code default; follows the prompt much better) |
| `OPENAI_REALTIME_VOICE`, `OPENAI_TRANSCRIBE_MODEL`                | AI client voice and input transcription model                                                                                                            |
| `OPENAI_REALTIME_REASONING_EFFORT`                                | `minimal` (default) for gpt-realtime-2.x; `none` for older models such as gpt-realtime-mini                                                              |
| `OPENAI_REALTIME_NOISE_REDUCTION`                                 | Noise reduction before the speech detector: `far_field` (default, laptop/phone mic), `near_field` (headset), `off`                                       |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                   | Recruiter panel account, created (or its password updated) at API startup; password min. 12 chars, argon2id                                              |
| `SESSION_TTL_HOURS`                                               | Panel login session lifetime (default 12 h)                                                                                                              |
| `ADMIN_API_KEY`                                                   | For scripts/CLI only: header `x-admin-key` on `/admin/*` endpoints (min. 24 chars; unset = disabled)                                                     |
| `LINK_TTL_DAYS`                                                   | Unused candidate links expire after this many days (default 14)                                                                                          |
| `MAX_REALTIME_CONNECTS`                                           | Max connections (first connect + reconnects) per assessment (default 5)                                                                                  |
| `STORAGE_DIR`, `MAX_RECORDING_MB`                                 | Where recordings are stored (relative to `apps/api`, default `storage`) and the upload limit                                                             |
| `NEXT_PUBLIC_API_URL`                                             | API URL as seen from the candidate's browser                                                                                                             |
| `EVAL_PROVIDER`, `EVAL_MODEL`                                     | Evaluation provider `openai` (default, `gpt-6-sol`) or `anthropic` (`claude-sonnet-5`); empty model = default                                            |
| `EVAL_REASONING_EFFORT`                                           | `low` / `medium` / `high` (default) for the evaluation model                                                                                             |
| `ANTHROPIC_API_KEY`                                               | Only needed with `EVAL_PROVIDER=anthropic`                                                                                                               |
| `EVAL_MIN_CONVERSATION_SEC`, `EVAL_MIN_CANDIDATE_SPEECH_SEC`      | Below these (default 7 min / 3 min) the report says "insufficient data" instead of scores                                                                |
| `EVAL_START_DELAY_MS`, `EVAL_MAX_ATTEMPTS`, `EVAL_RETRY_DELAY_MS` | Automatic evaluation: delay after the session, attempts, first retry delay (doubles)                                                                     |
| `DATA_RETENTION_DAYS`                                             | Retention for `pnpm purge-data` (default 90)                                                                                                             |

## Design

Tailwind CSS v4 + shadcn/ui (Radix) + lucide-react; tokens (colours, radius, shadows) in `apps/web/src/app/globals.css` — see "Design" in CLAUDE.md. In development, `http://localhost:3000/design` shows the tokens and components. Candidate screens are in English, the recruiter panel in Polish; both work from 360 px wide.

## Recruiter panel (milestone 4)

- `http://localhost:3000/admin` (Polish). Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The API hashes the password (argon2id) and issues a session token; the web app keeps it in an httpOnly cookie and calls the API server-side (`Authorization: Bearer …`). The browser never sees an API key.
- **Oceny**: list with search by name, status and role filters, newest first.
- **Nowa ocena**: candidate, optional e-mail, role (from the template registry) and target level → a page with the candidate link, "Kopiuj link" and a ready invitation message in Polish and English.
- **Raport**: recommendation, CEFR, criteria with score bars and expandable evidence quotes, recording, transcript split by speaker. Actions: "Oceń ponownie", "Drukuj / PDF" (print stylesheet — save as PDF from the browser and attach it in the ATS) and "Usuń dane kandydata" (GDPR: deletes transcript, recordings and reports, anonymises the name, invalidates the link and hides the assessment from the list).
- `ADMIN_API_KEY` remains only for scripts and the CLI.

## Running an assessment

1. Start everything (`pnpm db:up`, `pnpm db:migrate`, `pnpm dev`) with `OPENAI_API_KEY` set in `.env`.
2. Create an assessment in the panel (**Nowa ocena**), or with the CLI:

   ```powershell
   pnpm create-assessment --name "Jan Kowalski" --level B2 --role backend-developer
   ```

   or through the admin API from a script (header `x-admin-key` = `ADMIN_API_KEY`):

   ```powershell
   $body = @{ roleTemplateId = 'backend-developer'; targetLevel = 'B2'; candidateName = 'Jan Kowalski' } | ConvertTo-Json
   Invoke-RestMethod -Method Post -Uri http://localhost:3001/admin/assessments `
     -Headers @{ 'x-admin-key' = $env:ADMIN_API_KEY } -ContentType 'application/json' -Body $body
   ```

3. Open the printed link (`http://localhost:3000/a/<token>`) in Chrome/Edge: consent → microphone check → ~12-minute voice conversation → end screen.

Microphone access requires a secure context: `http://localhost` works, a LAN address such as `http://192.168.x.x:3000` does not (use HTTPS for that).

How it works:

- The AI client's instructions are built only on the server (`apps/api/src/prompts/client/`, current version selected in `index.ts`; built from the role template + target level + guardrails). The browser gets a short-lived OpenAI client secret and connects to the Realtime API directly over WebRTC.
- Transcript turns (candidate input transcription + AI audio transcript) are sent to the API as they finish and stored in `TranscriptTurn`.
- Asked to slow down, the AI client speaks more calmly and simply in its own voice (a lowered `audio.output.speed` was tried and removed: it sounded robotic).
- Interruptions on the candidate's device (e.g. a phone call on a mobile takes the microphone and suspends the page's audio while WebRTC stays connected) are detected; the screen says the call was interrupted, and "Continue" gets a working microphone back onto the same call (`RTCRtpSender.replaceTrack`) and lets the client pick up where it stopped. The timer keeps running.
- Noise reduction (`OPENAI_REALTIME_NOISE_REDUCTION`) filters short noises before the speech detector, so a creaking chair does not cut the client off. The client's first turn of each connection (greeting, or "the line dropped") cannot be interrupted at all: on a phone speaker the client's own echo would otherwise cut it off before echo cancellation settles. The browser switches interruptions on after that turn.
- The conversation is hard-stopped after 12 minutes, measured from the first connection (the timer keeps running during a disconnect). After a dropped connection the candidate can reconnect; the AI gets the transcript so far and continues.
- Audio (candidate + AI mixed) is recorded per connection segment and uploaded to `apps/api/storage/recordings/<assessmentId>/` (`Recording` rows).
- Endpoints: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; `GET|POST /admin/assessments`, `GET /admin/assessments/:id`, `POST …/:id/evaluate`, `DELETE …/:id/data`, `GET …/:id/recordings/:recordingId`; `GET /public/assessments/:token`, `POST …/consent`, `…/realtime-session`, `…/turns`, `…/recording`, `…/end`.

## Evaluation and report (milestone 3)

- When a session ends, the API evaluates it automatically in the background (after `EVAL_START_DELAY_MS`), retries transient provider errors and sets the status to `EVALUATED` or `FAILED`. Pending evaluations are resumed after an API restart.
- Too short or interrupted conversations (defaults: under 7 min, or under 3 min of candidate speech) get an "insufficient data" report without calling the model.
- The model scores only the candidate's turns (the AI's turns are context), gives 1–3 quotes per criterion and CEFR speaking/listening. Every quote is checked against the transcript after normalisation; quotes that are not found are dropped and logged. The recommendation (`READY` / `READY_WITH_CONCERNS` / `NOT_READY`) is computed by a fixed rule relative to the target level (`apps/api/src/evaluation/recommendation.ts`).
- Prompt: `apps/api/src/prompts/evaluation/` (current version re-exported from `index.ts`), the same for every provider. Each report stores provider, model and prompt version.
- Report page (Polish): `http://localhost:3000/admin/assessments/<id>` in the recruiter panel. `pnpm create-assessment` prints this link.
- Re-run for calibration: the button on the report page, or `POST /admin/assessments/:id/evaluate` (session or `x-admin-key`). Earlier reports are kept.

## Roles and prompt tuning (milestone 5)

- Role templates: **Backend Developer** (fintech client, Amsterdam), **Frontend Developer** (outdoor retail e-commerce, Manchester), **QA Engineer** (healthtech, Lyon), **Business Analyst** (insurance claims client, Rotterdam) and **Product Owner** (logistics customer portal, Gothenburg) in `packages/shared/roles/`. Adding a role = adding a template file and listing it in `roles/index.ts`; template tests check that every suggestion is a single question and that no evaluator framing ("see whether…", "clarifying questions") reaches the AI client.
- `pnpm simulate --role business-analyst --persona medium [--prompt client-v3] [--runs 3] [--evaluate]` runs a text-mode conversation between the AI client and a scripted candidate and checks every client turn against the guardrails. Workflow and personas: `apps/api/src/prompts/README.md`.
- Simulations print an estimated cost: the realtime part runs in text mode, so a voice call costs several times more; plus the evaluation.
- Findings from the first real run and simulations are recorded in the prompt files (`client/v3.ts`, `evaluation/v2.ts`) and in CLAUDE.md (realtime model choice).

## Cost tracking

- Every realtime connection reports its token usage (the `usage` of each `response.done` and transcription event) from the browser to `POST /public/assessments/:token/usage` as running totals per connection; every evaluation stores the provider's token usage with its report. Rows live in `UsageRecord` (no personal data; removed with the assessment by the retention purge).
- `pnpm usage-report [--days 30]` prices them with the list prices in `apps/api/src/usage/pricing.ts` (update it when prices or models change; unknown models are listed instead of guessed). Failed evaluation attempts are not counted.

## Tests

- `pnpm verify` — everything below except e2e/eval, plus format, lint and typecheck. Run it before every commit.
- `pnpm test` — unit tests (Vitest) for `shared`, `api` and the framework-free logic in `apps/web/src/lib`.
- `pnpm test:e2e` — API e2e tests against a separate database `<POSTGRES_DB>_test` on the same PostgreSQL (created and migrated automatically; override with `TEST_DATABASE_URL`). OpenAI and the evaluation provider are replaced by fakes, so no API key is needed.
- `pnpm test:ui` — Playwright browser tests (`apps/web/e2e`): candidate consent → microphone check (Chromium's fake microphone) → conversation screen, login, creating an assessment, reading a report and recording a decision. Starts a fresh API build on port 3101 with its own database `<POSTGRES_DB>_ui` and a production build of the web app on port 3100; no AI provider is called (keys are blanked). First time: `pnpm --filter @clientready/web exec playwright install chromium`. Needs `pnpm db:up`.
- `pnpm test:eval` — sends scripted transcripts for every role (backend developer and business analyst: strong B2+/C1, medium B1/B2 struggling under pressure, weak A2/B1) to the configured evaluation provider and checks that they get READY / READY_WITH_CONCERNS / NOT_READY, sensible CEFR levels and verified evidence. Uses real API calls (a few cents); skipped without a key.

## Database

- Prisma schema: `apps/api/prisma/schema.prisma`, migrations in `apps/api/prisma/migrations`.
- After changing the schema: `pnpm db:migrate` (prompts for a migration name).

## Deploy (milestone 6)

Zero-cost demo setup, everything in the EU:

| Part          | Where                                         | Config in repo                          |
| ------------- | --------------------------------------------- | --------------------------------------- |
| Web (Next.js) | Vercel Hobby, region `fra1`                   | `apps/web/vercel.json`                  |
| API (NestJS)  | Render free web service, Frankfurt, Docker    | `render.yaml`, `apps/api/Dockerfile`    |
| Database      | Supabase free (Frankfurt), session pooler     | `DATABASE_URL`, `DATABASE_SSL_CA`       |
| Recordings    | Supabase Storage, private bucket `recordings` | `STORAGE_DRIVER=supabase`, `SUPABASE_*` |

Pushing to `main` deploys both the web (Vercel) and the API (Render, only when API-related files change). The API applies pending Prisma migrations on start and creates/updates the recruiter account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

**How the parts talk to each other.** The candidate's browser calls the API directly (CORS allows only `WEB_ORIGIN`; no cookies involved). The recruiter panel calls the API only from the Next.js server with a Bearer token, so the session cookie stays first-party on the Vercel domain — no cross-site cookies (`SameSite=None`) needed. A `/api` proxy through Vercel was rejected: recording uploads (up to ~10–50 MB) exceed Vercel's 4.5 MB function body limit, and it would add a hop. Recordings are played from short-lived Supabase signed URLs.

**Free-tier behaviour.**

- Render puts the API to sleep after 15 minutes without traffic; waking takes up to ~1 minute. The login page, the panel and the candidate page wake it via `/health` and show "Uruchamiamy serwer…" / "Preparing your conversation…" meanwhile; the candidate page keeps it awake while open.
- **Keep-alive (recommended)**: an external monitor calling `/health` every 5 minutes keeps the API awake, so nobody waits for the wake-up (checklist step 6). One service running 24/7 fits Render's 750 free instance hours per month (if the workspace has no other free services). `/health` also queries the database, which keeps the Supabase project from being paused.
- Render's disk is ephemeral: nothing is stored locally (recordings go to Supabase Storage).
- The evaluation queue lives in memory; after a restart, sessions in `COMPLETED` (no report yet) are evaluated again automatically.
- Supabase pauses free projects after about a week without activity — unpause it in the Supabase dashboard before a demo.
- Data older than `DATA_RETENTION_DAYS` is purged by the API when it runs (daily while awake) and on demand with `pnpm purge-data`.
- Vercel Hobby is meant for non-commercial use; move to Pro (or another host) before real paid usage.
- Some ad blockers (seen with uBlock Origin) block requests to `*.onrender.com`: the page then stays on "Uruchamiamy serwer…" (DevTools: `health` requests without a response). Fix for the user: disable the blocker for the site; long-term fix: a custom domain for the API.

### Checklist — manual steps

1. **Supabase** (supabase.com → New project, region _Central EU (Frankfurt)_):
   - Connect → **Session pooler** connection string (port 5432), with your database password, and append `?sslmode=require` → this is `DATABASE_URL`.
   - Project Settings → Database → SSL Configuration → **Download certificate**; its PEM content (`-----BEGIN CERTIFICATE----- …`) is `DATABASE_SSL_CA`.
   - Project Settings → API Keys → **Secret key** (`sb_secret_…`) → `SUPABASE_SECRET_KEY`; Project URL (`https://<ref>.supabase.co`) → `SUPABASE_URL`.
   - Storage: nothing to do — the API creates the private `recordings` bucket on the first upload (or create it yourself, **private**).
2. **Render** (render.com → New → **Blueprint** → this GitHub repo; it reads `render.yaml`). Fill in the secrets it asks for:
   - `DATABASE_URL`, `DATABASE_SSL_CA`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (from step 1)
   - `WEB_ORIGIN` = your Vercel production URL, e.g. `https://clientready.vercel.app` (no trailing slash)
   - `OPENAI_API_KEY`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (min. 12 characters) — the recruiter login; changing the password here and redeploying updates it and logs out existing sessions.
   - Wait for the deploy, then open `https://<service>.onrender.com/health` → `{"status":"ok","db":"ok"}`.
3. **Vercel** (your existing project):
   - Settings → General → **Root Directory** `apps/web` (framework Next.js, Node.js 22.x). Install/build commands and the `fra1` region come from `apps/web/vercel.json`.
   - Settings → Environment Variables (Production): `NEXT_PUBLIC_API_URL` and `API_URL` = `https://<service>.onrender.com`.
   - Optional co-branding for a customer demo: `NEXT_PUBLIC_CUSTOMER_NAME`, `NEXT_PUBLIC_CUSTOMER_LOGO_URL` (https URL of their logo), `NEXT_PUBLIC_BRAND_COLOR` (e.g. `#0b5cab`). These live only in Vercel — the repository stays free of customer branding.
   - Redeploy (the `NEXT_PUBLIC_*` value is built into the bundle).
4. **OpenAI**: check the realtime rate limits of your usage tier (see CLAUDE.md) and set a monthly budget limit.
5. **Smoke test**: open `https://<vercel-url>/admin` (first time: wake-up message) → log in → create an assessment → open the candidate link (HTTPS, so the microphone works also on other devices) → short conversation → end → report with recording within a minute.
6. **Keep-alive monitor** (optional, recommended): e.g. [UptimeRobot](https://uptimerobot.com) (free) → New monitor → HTTP(s), URL `https://<service>.onrender.com/health`, interval 5 minutes. It also e-mails you when the API is down.
7. **Error monitoring** (optional, recommended before real candidates): create a free [Sentry](https://sentry.io) account with data stored in the **EU** (organisation region _European Union_), and two projects: _Node.js / NestJS_ (API) and _Next.js_ (web).
   - Render: `SENTRY_DSN` = the API project's DSN.
   - Vercel: `NEXT_PUBLIC_SENTRY_DSN` = the web project's DSN; for readable stack traces also `SENTRY_AUTH_TOKEN` (Settings → Auth Tokens), `SENTRY_ORG`, `SENTRY_PROJECT`. Redeploy.
   - Nothing personal is sent (no IPs, headers, request bodies or transcripts; candidate link tokens are redacted). Besides crashes, the web reports handled problems in the conversation (realtime connection failed/dropped, recording or transcript upload failing) tagged `area`.
8. **CI gate**: GitHub Actions (`.github/workflows/ci.yml`) runs `pnpm verify`, the API e2e tests and the web build on every push. Render deploys only after the checks pass (`autoDeployTrigger: checksPass` in `render.yaml`; for an existing service also set Settings → Auto-Deploy → _After CI Checks Pass_). Vercel deploys independently; to make it wait too, enable the CI check under Vercel → Settings → Deployment Checks if your plan offers it.

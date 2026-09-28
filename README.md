# ClientReady

AI voice assessment that checks whether a candidate can handle a real conversation with a client in English. See [CLAUDE.md](CLAUDE.md) for the product and technical overview.

## Repository layout

```
apps/api          NestJS REST API (Prisma + PostgreSQL)
apps/web          Next.js (App Router) — candidate flow + recruiter panel
packages/shared   Shared types, zod schemas, role templates (packages/shared/roles/*.ts)
docker-compose.yml  Local PostgreSQL
```

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

| Command                             | What it does                                                        |
| ----------------------------------- | ------------------------------------------------------------------- |
| `pnpm dev`                          | Build `shared`, then run all packages in watch/dev mode             |
| `pnpm build`                        | Production build of all packages                                    |
| `pnpm typecheck`                    | TypeScript check across the workspace                               |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                                                              |
| `pnpm format` / `pnpm format:check` | Prettier                                                            |
| `pnpm db:up` / `pnpm db:down`       | Start / stop PostgreSQL (docker compose)                            |
| `pnpm db:migrate`                   | Create/apply migrations in development (`prisma migrate dev`)       |
| `pnpm db:generate`                  | Regenerate the Prisma client (`apps/api/src/generated`, gitignored) |
| `pnpm db:studio`                    | Open Prisma Studio                                                  |
| `pnpm test`                         | Unit tests (role templates, prompts, evaluation rules, storage)     |
| `pnpm test:e2e`                     | API end-to-end tests (needs `pnpm db:up`)                           |
| `pnpm test:eval`                    | Live evaluation of 3 fixture transcripts (real provider, costs ¢)   |
| `pnpm create-assessment --name "…"` | Create an assessment; prints the candidate link and report link     |
| `pnpm purge-data [--dry-run]`       | Delete assessments older than `DATA_RETENTION_DAYS`                 |

## Configuration

All configuration lives in a single `.env` at the repository root (see `.env.example`). The API validates it with zod at startup and refuses to start on invalid values. The web app reads the same file (`next.config.ts`). Never commit `.env`.

If port 5433 is taken, change `POSTGRES_PORT` and the port in `DATABASE_URL` in `.env`.

| Variable                                                          | Purpose                                                                                                                             |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`                                                  | Server-side only; used to mint short-lived realtime client secrets                                                                  |
| `OPENAI_REALTIME_MODEL`                                           | Realtime model for the live conversation (default `gpt-realtime-2.1`; `-mini` is cheaper but follows the prompt much less reliably) |
| `OPENAI_REALTIME_VOICE`, `OPENAI_TRANSCRIBE_MODEL`                | AI client voice and input transcription model                                                                                       |
| `OPENAI_REALTIME_REASONING_EFFORT`                                | `minimal` (default) for gpt-realtime-2.x; `none` for older models such as gpt-realtime-mini                                         |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                   | Recruiter panel account, created (or its password updated) at API startup; password min. 12 chars, argon2id                         |
| `SESSION_TTL_HOURS`                                               | Panel login session lifetime (default 12 h)                                                                                         |
| `ADMIN_API_KEY`                                                   | For scripts/CLI only: header `x-admin-key` on `/admin/*` endpoints (min. 24 chars; unset = disabled)                                |
| `LINK_TTL_DAYS`                                                   | Unused candidate links expire after this many days (default 14)                                                                     |
| `MAX_REALTIME_CONNECTS`                                           | Max connections (first connect + reconnects) per assessment (default 5)                                                             |
| `STORAGE_DIR`, `MAX_RECORDING_MB`                                 | Where recordings are stored (relative to `apps/api`, default `storage`) and the upload limit                                        |
| `NEXT_PUBLIC_API_URL`                                             | API URL as seen from the candidate's browser                                                                                        |
| `EVAL_PROVIDER`, `EVAL_MODEL`                                     | Evaluation provider `openai` (default, `gpt-6-sol`) or `anthropic` (`claude-sonnet-5`); empty model = default                       |
| `EVAL_REASONING_EFFORT`                                           | `low` / `medium` / `high` (default) for the evaluation model                                                                        |
| `ANTHROPIC_API_KEY`                                               | Only needed with `EVAL_PROVIDER=anthropic`                                                                                          |
| `EVAL_MIN_CONVERSATION_SEC`, `EVAL_MIN_CANDIDATE_SPEECH_SEC`      | Below these (default 7 min / 3 min) the report says "insufficient data" instead of scores                                           |
| `EVAL_START_DELAY_MS`, `EVAL_MAX_ATTEMPTS`, `EVAL_RETRY_DELAY_MS` | Automatic evaluation: delay after the session, attempts, first retry delay (doubles)                                                |
| `DATA_RETENTION_DAYS`                                             | Retention for `pnpm purge-data` (default 90)                                                                                        |

## Design

Tailwind CSS v4 + shadcn/ui (Radix) + lucide-react; tokens (colours, radius, shadows) in `apps/web/src/app/globals.css` — see "Design" in CLAUDE.md. In development, `http://localhost:3000/design` shows the tokens and components. Candidate screens are in English, the recruiter panel in Polish; both work from 360 px wide.

## Recruiter panel (milestone 4)

- `http://localhost:3000/admin` (Polish). Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The API hashes the password (argon2id) and issues a session token; the web app keeps it in an httpOnly cookie and calls the API server-side (`Authorization: Bearer …`). The browser never sees an API key.
- **Oceny**: list with search by name, status and role filters, newest first.
- **Nowa ocena**: candidate, optional e-mail, role (from the template registry) and target level → a page with the candidate link, "Kopiuj link" and a ready invitation message in Polish and English.
- **Raport**: recommendation, CEFR, criteria with score bars and expandable evidence quotes, recording, transcript split by speaker. Actions: "Oceń ponownie", "Drukuj / PDF" (print stylesheet — save as PDF from the browser and attach it in the ATS) and "Usuń dane kandydata" (GDPR: deletes transcript, recordings and reports, anonymises the name and invalidates the link).
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

- The AI client's instructions are built only on the server (`apps/api/src/prompts/client/v2.ts`, from the role template + target level + guardrails). The browser gets a short-lived OpenAI client secret and connects to the Realtime API directly over WebRTC.
- Transcript turns (candidate input transcription + AI audio transcript) are sent to the API as they finish and stored in `TranscriptTurn`.
- The conversation is hard-stopped after 12 minutes, measured from the first connection (the timer keeps running during a disconnect). After a dropped connection the candidate can reconnect; the AI gets the transcript so far and continues.
- Audio (candidate + AI mixed) is recorded per connection segment and uploaded to `apps/api/storage/recordings/<assessmentId>/` (`Recording` rows).
- Endpoints: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; `GET|POST /admin/assessments`, `GET /admin/assessments/:id`, `POST …/:id/evaluate`, `DELETE …/:id/data`, `GET …/:id/recordings/:recordingId`; `GET /public/assessments/:token`, `POST …/consent`, `…/realtime-session`, `…/turns`, `…/recording`, `…/end`.

## Evaluation and report (milestone 3)

- When a session ends, the API evaluates it automatically in the background (after `EVAL_START_DELAY_MS`), retries transient provider errors and sets the status to `EVALUATED` or `FAILED`. Pending evaluations are resumed after an API restart.
- Too short or interrupted conversations (defaults: under 7 min, or under 3 min of candidate speech) get an "insufficient data" report without calling the model.
- The model scores only the candidate's turns (the AI's turns are context), gives 1–3 quotes per criterion and CEFR speaking/listening. Every quote is checked against the transcript after normalisation; quotes that are not found are dropped and logged. The recommendation (`READY` / `READY_WITH_CONCERNS` / `NOT_READY`) is computed by a fixed rule relative to the target level (`apps/api/src/evaluation/recommendation.ts`).
- Prompt: `apps/api/src/prompts/evaluation/v1.ts` (`evaluation-v1`), the same for every provider. Each report stores provider, model and prompt version.
- Report page (Polish): `http://localhost:3000/admin/assessments/<id>` in the recruiter panel. `pnpm create-assessment` prints this link.
- Re-run for calibration: the button on the report page, or `POST /admin/assessments/:id/evaluate` (session or `x-admin-key`). Earlier reports are kept.

## Tests

- `pnpm test` — unit tests (Vitest).
- `pnpm test:e2e` — API e2e tests against a separate database `<POSTGRES_DB>_test` on the same PostgreSQL (created and migrated automatically; override with `TEST_DATABASE_URL`). OpenAI and the evaluation provider are replaced by fakes, so no API key is needed.
- `pnpm test:eval` — sends three scripted transcripts (strong B2+/C1, medium B1/B2 struggling under pressure, weak A2/B1) to the configured evaluation provider and checks that they get READY / READY_WITH_CONCERNS / NOT_READY, sensible CEFR levels and verified evidence. Uses real API calls (a few cents); skipped without a key.

## Database

- Prisma schema: `apps/api/prisma/schema.prisma`, migrations in `apps/api/prisma/migrations`.
- After changing the schema: `pnpm db:migrate` (prompts for a migration name).

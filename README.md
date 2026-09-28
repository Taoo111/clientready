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
Copy-Item .env.example .env     # then fill in secrets if needed
pnpm install                    # also generates the Prisma client
pnpm db:up                      # start PostgreSQL in Docker (host port 5433)
pnpm db:migrate                 # apply Prisma migrations
pnpm dev                        # start shared (watch), api and web
```

Then open:

- Web: http://localhost:3000
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
| `pnpm test`                         | Unit tests (role templates, client prompt, storage)                 |
| `pnpm test:e2e`                     | API end-to-end tests (needs `pnpm db:up`)                           |
| `pnpm create-assessment --name "…"` | Create an assessment and print the candidate link                   |

## Configuration

All configuration lives in a single `.env` at the repository root (see `.env.example`). The API validates it with zod at startup and refuses to start on invalid values. The web app reads the same file (`next.config.ts`). Never commit `.env`.

If port 5433 is taken, change `POSTGRES_PORT` and the port in `DATABASE_URL` in `.env`.

| Variable                                           | Purpose                                                                                      |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`                                   | Server-side only; used to mint short-lived realtime client secrets                           |
| `OPENAI_REALTIME_MODEL`                            | Realtime model for the live conversation (default `gpt-realtime-2.1-mini`)                   |
| `OPENAI_REALTIME_VOICE`, `OPENAI_TRANSCRIBE_MODEL` | AI client voice and input transcription model                                                |
| `OPENAI_REALTIME_REASONING_EFFORT`                 | `minimal` (default) for gpt-realtime-2.x; `none` for older models such as gpt-realtime-mini  |
| `ADMIN_API_KEY`                                    | Protects `/admin/*` until recruiter login exists (min. 24 chars; unset = admin API off)      |
| `LINK_TTL_DAYS`                                    | Unused candidate links expire after this many days (default 14)                              |
| `MAX_REALTIME_CONNECTS`                            | Max connections (first connect + reconnects) per assessment (default 5)                      |
| `STORAGE_DIR`, `MAX_RECORDING_MB`                  | Where recordings are stored (relative to `apps/api`, default `storage`) and the upload limit |
| `NEXT_PUBLIC_API_URL`                              | API URL as seen from the candidate's browser                                                 |

## Running an assessment (milestone 2)

1. Start everything (`pnpm db:up`, `pnpm db:migrate`, `pnpm dev`) with `OPENAI_API_KEY` set in `.env`.
2. Create an assessment — either with the CLI:

   ```powershell
   pnpm create-assessment --name "Jan Kowalski" --level B2 --role backend-developer
   ```

   or through the admin API (header `x-admin-key` = `ADMIN_API_KEY`):

   ```powershell
   $body = @{ roleTemplateId = 'backend-developer'; targetLevel = 'B2'; candidateName = 'Jan Kowalski' } | ConvertTo-Json
   Invoke-RestMethod -Method Post -Uri http://localhost:3001/admin/assessments `
     -Headers @{ 'x-admin-key' = $env:ADMIN_API_KEY } -ContentType 'application/json' -Body $body
   ```

3. Open the printed link (`http://localhost:3000/a/<token>`) in Chrome/Edge: consent → microphone check → ~12-minute voice conversation → end screen.

Microphone access requires a secure context: `http://localhost` works, a LAN address such as `http://192.168.x.x:3000` does not (use HTTPS for that).

How it works:

- The AI client's instructions are built only on the server (`apps/api/src/prompts/client/v1.ts`, from the role template + target level + guardrails). The browser gets a short-lived OpenAI client secret and connects to the Realtime API directly over WebRTC.
- Transcript turns (candidate input transcription + AI audio transcript) are sent to the API as they finish and stored in `TranscriptTurn`.
- The conversation is hard-stopped after 12 minutes, measured from the first connection (the timer keeps running during a disconnect). After a dropped connection the candidate can reconnect; the AI gets the transcript so far and continues.
- Audio (candidate + AI mixed) is recorded per connection segment and uploaded to `apps/api/storage/recordings/<assessmentId>/` (`Recording` rows).
- Endpoints: `POST /admin/assessments`; `GET /public/assessments/:token`, `POST …/consent`, `…/realtime-session`, `…/turns`, `…/recording`, `…/end`.

## Tests

- `pnpm test` — unit tests (Vitest).
- `pnpm test:e2e` — API e2e tests against a separate database `<POSTGRES_DB>_test` on the same PostgreSQL (created and migrated automatically; override with `TEST_DATABASE_URL`). OpenAI is replaced by a fake, so no API key is needed.

## Database

- Prisma schema: `apps/api/prisma/schema.prisma`, migrations in `apps/api/prisma/migrations`.
- After changing the schema: `pnpm db:migrate` (prompts for a migration name).

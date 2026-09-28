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

## Configuration

All configuration lives in a single `.env` at the repository root (see `.env.example`). The API validates it with zod at startup and refuses to start on invalid values. Never commit `.env`.

If port 5433 is taken, change `POSTGRES_PORT` and the port in `DATABASE_URL` in `.env`.

## Database

- Prisma schema: `apps/api/prisma/schema.prisma`, migrations in `apps/api/prisma/migrations`.
- After changing the schema: `pnpm db:migrate` (prompts for a migration name).

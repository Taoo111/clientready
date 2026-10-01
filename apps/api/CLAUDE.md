# API (NestJS)

Read the root CLAUDE.md first (product, guardrails, engineering principles). This file is the map of `apps/api`.

## Layout

```
src/
  main.ts, app.module.ts   bootstrap (CORS, proxy, throttling) and the module list
  instrument.ts            Sentry init; must stay the first import of main.ts (reads SENTRY_* directly)
  config/env.ts            zod schema of every env variable (the only place that reads process.env)
  infra/                   plumbing, global InfraModule: Clock, PrismaService, Storage (local | supabase),
                           http/ (ZodValidationPipe, PublicError)
  auth/                    recruiter login, sessions, AdminAuthGuard (session or x-admin-key)
  assessments/             recruiter side: list/create/detail/delete-data + the lifecycle rules
  conversation/            candidate side by link token: view, consent, realtime session, turns, end
    realtime/              RealtimeSecretProvider (abstract) + OpenAI implementation
  recordings/              upload by the candidate, streaming to the recruiter
  evaluation/              EvaluationScheduler (queue, retries) -> EvaluationService (evaluate + store)
                           -> evaluate.ts (pure pipeline) ; providers/ (OpenAI, Anthropic)
  retention/               periodic purge of old data
  prompts/                 versioned client and evaluation prompts (see prompts/README.md)
  cli/, simulation/        tsx scripts: create-assessment, purge-data, simulate (no Nest)
  generated/               Prisma client (generated, gitignored)
test/                      e2e (supertest, separate <db>_test database, fakes in test-app.ts), fixtures, eval
```

Module dependencies (no cycles): `conversation -> evaluation -> assessments`, `recordings -> conversation`. Everything may inject `infra` and `auth`.

## Anatomy of a feature

| File                   | Responsibility                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `x.module.ts`          | wiring only                                                                              |
| `x.controller.ts`      | routes, guards, throttling, `ZodValidationPipe`, mapping domain errors to HTTP. No logic |
| `x.service.ts`         | one use case per method; talks to Prisma/Storage/providers; logs with the assessment id  |
| `*.ts` pure functions  | rules and mappers (`assessment-rules.ts`, `assessment.mapper.ts`, `public-view.ts`)      |
| `*.test.ts` next to it | unit tests of the pure parts                                                             |

Controllers that serve the recruiter are guarded with `@UseGuards(AdminAuthGuard)` and live under `admin/...` routes; candidate routes live under `public/assessments/:token` and validate the token with `CandidateTokenPipe`. Candidate-facing failures are `PublicError` codes (the web maps them to messages).

## Rules

- Plain functions that the CLI also needs take their dependencies as arguments (`createAssessment(prisma, input, webOrigin)`), so they run without Nest.
- Time comes from the injected `Clock`, never `new Date()` in rules (tests move time with `FakeClock`).
- New external service: abstract class as DI token + implementation + factory selected by env; add a fake in `test/test-app.ts`.
- New env variable: add it to `config/env.ts` (with default or validation) and `.env.example`.
- Prisma schema change: `pnpm db:migrate` (creates a migration), commit the migration; never edit applied migrations.
- Prompt change: new version file, never edit a used one (see `prompts/README.md`).
- Services may throw Nest `NotFoundException`/`ConflictException` for plain cases; anything the caller must distinguish gets its own error class.

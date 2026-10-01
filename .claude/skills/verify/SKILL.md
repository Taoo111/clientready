---
name: verify
description: Run every quality gate of the ClientReady monorepo (format, lint, typecheck, unit tests, and e2e when the API changed) and fix what fails. Use before committing or when asked to check that everything is green.
---

# Verify

Run the gates from the repo root, in this order, and stop to fix the first failure before
moving on. Never commit while a gate is red, and never "fix" a gate by weakening it
(skipping tests, disabling lint rules, loosening types).

1. `pnpm verify` — format check, ESLint, typecheck (all packages), unit tests (shared, api, web).
   - Formatting failures: `pnpm format`, then re-run.
   - Lint `max-lines` errors mean the file does too much: split it by responsibility
     (see "Engineering principles" in CLAUDE.md), do not raise the limit.
2. If anything under `apps/api` or `packages/shared` changed: `pnpm test:e2e`
   (needs Postgres: `pnpm db:up`, Docker Desktop must be running).
3. If anything under `apps/web` changed: `pnpm --filter @clientready/web build`
   (catches Next.js-only errors the typecheck misses).

Do not run `pnpm test:eval` or `pnpm simulate` unless asked: they call paid AI APIs.

Report the result as a short list: each gate, pass/fail, and what you fixed.

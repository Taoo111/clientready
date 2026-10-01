@AGENTS.md

# Web (Next.js)

Read the root CLAUDE.md first (product, design, engineering principles). This file is the map of `apps/web`.

## Layout

```
src/
  app/                       routes only: load data, pick components, no business logic
    a/[token]/               candidate flow (client-side, talks to the API from the browser)
    admin/                   recruiter panel (server components; API called server-side only)
      actions.ts             server actions (form parsing + adminApi + revalidate/redirect)
    design/                  token/component showcase (development)
  components/
    candidate/               one file per screen/step + small pieces (session-timer, end-call-button, ...)
    admin/                   panel pieces; admin/report/ = sections of the report page
    brand/, common/          logo/white-label; Notice, Spinner, EmptyState
    ui/                      shadcn/ui (generated, edit freely)
  lib/
    candidate-api.ts         typed candidate API client (browser)
    admin/session.ts         recruiter session cookie + authenticated fetch (server only)
    admin/admin-api.ts       typed recruiter API (server only) - pages/actions never build URLs
    realtime/                ConversationController (state for the live screen) -> RealtimeConnection
                             (WebRTC) + TurnTracker (events -> transcript turns) + TranscriptUploader
    audio/                   LevelMeter, ConversationRecorder, SegmentRecorder (per-connection uploads)
    api-wake.ts, brand.ts, format.ts
  i18n/en.ts, i18n/pl.ts     every user-facing string (candidate English, panel Polish)
```

## Rules

- Pages and layouts stay thin: fetch via `adminApi` / `candidateApi`, render components. Markup that grows past a screenful becomes a component in `components/<area>/`.
- No hard-coded user-facing text in components: add it to `i18n/en.ts` (candidate) or `i18n/pl.ts` (panel).
- Server-only code (`lib/admin/*`, `app/admin/actions.ts`) never runs in the browser; the recruiter session cookie never leaves the server.
- Browser-only logic that is not React (WebRTC, audio, event bookkeeping) lives in `lib/` as plain classes; components subscribe via `useSyncExternalStore`. Keep such logic testable without a DOM where possible (see `turn-tracker.test.ts`).
- Styling: Tailwind utilities + design tokens from `app/globals.css`; no new colours outside the tokens; follow "Design" in the root CLAUDE.md (states, mobile-first, print).
- Files kebab-case, one exported component per file (small private helpers in the same file are fine).
- Tests: `pnpm --filter @clientready/web test` (vitest, `src/**/*.test.ts`, no DOM). Before a commit also `pnpm --filter @clientready/web build`.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current product authority

Follow [AGENTS.md](AGENTS.md) and [PRODUCT_PRINCIPLES.md](PRODUCT_PRINCIPLES.md), including the September 8, 2026 Notion acceptance criteria. These supersede historical manual-only and loss-aversion directives. The architecture also includes apps/desktop, apps/desktop-native, apps/web, packages/core and packages/contracts. Use Sandbox and synthetic data; production changes, public releases and spending require explicit approval. Historical release commands below are reference material, not authorization to execute them.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Mobile**: Expo (React Native) — `apps/mobile`
- **API**: Next.js 14 (API routes only, no pages) — `apps/api`
- **Database**: PostgreSQL via Prisma — `packages/db`
- **Shared types**: TypeScript — `packages/types`
- **Auth**: JWT (access token 15m / refresh token 30d) stored in expo-secure-store
- **Banking**: Plaid (sandbox by default)

## Commands

```bash
# From repo root
pnpm install             # install all workspaces
pnpm dev                 # start api + mobile concurrently via Turborepo
pnpm build               # build all packages
pnpm typecheck           # typecheck all packages

# Database (run from packages/db or via root)
pnpm db:generate         # generate Prisma client after schema changes
pnpm db:migrate          # run migrations (dev)
pnpm db:studio           # open Prisma Studio

# Mobile only
cd apps/mobile && pnpm ios      # run on iOS simulator
cd apps/mobile && pnpm android  # run on Android emulator

# API only
cd apps/api && pnpm dev         # start on port 3001
```

## Environment Setup

Copy `apps/api/.env.example` to `apps/api/.env` and fill in:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — random 32+ char strings
- `PLAID_CLIENT_ID` / `PLAID_SECRET` / `PLAID_ENV` — from Plaid dashboard (use `sandbox` env to start)

Mobile API URL: set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env.local` (defaults to `http://localhost:3001/api`).

## Architecture

### API (`apps/api/src/`)
- `app/api/` — Next.js route handlers. Each file exports `GET`/`POST`/`PATCH`/`DELETE`
- `lib/auth.ts` — JWT sign/verify, `getAuthUser(req)` extracts user from Bearer token
- `lib/response.ts` — `ok()`, `err()`, `unauthorized()`, `notFound()` helpers; all routes use these
- `lib/plaid.ts` — Plaid client + helper functions
- `lib/categories.ts` — Maps Plaid categories to internal categories with caching
- `lib/nudge-engine.ts` — Generates loss-aversion nudges; called on `GET /nudges`
- `lib/dates.ts` — `startOfMonth`, `endOfMonth`, etc.

### Mobile (`apps/mobile/`)
- `app/` — Expo Router file-based routing
  - `(auth)/` — Login, Register screens (redirect to tabs if authed)
  - `(tabs)/` — Dashboard, Transactions, Budgets, Goals, Profile
- `src/lib/api.ts` — Typed `api.get/post/patch/delete` with auto token refresh on 401
- `src/lib/theme.ts` — All colors, spacing, radius, typography constants
- `src/store/auth.ts` — Zustand store for auth state + SecureStore persistence

### Database (`packages/db/`)
- `prisma/schema.prisma` — Full schema. All monetary values use `Decimal @db.Decimal(12,2)`
- `src/index.ts` — Re-exports `prisma` singleton + all Prisma types

## Key Design Patterns

**Budget UX**: Use calm language for responsibilities, permitted spending, and remaining amounts. Keep responsibility, actual payer, and account visibility independent. Follow PRODUCT_PRINCIPLES.md.

**Legacy streak logic**: Existing streak endpoints are compatibility code, not a requirement to add gamification or pressure to the beta.

**Nudge engine**: `generateNudgesForUser()` in `lib/nudge-engine.ts` is called on `GET /nudges`. Deduplicates by type+day. Existing loss-aversion copy is legacy behavior; new or revised messages must be calm and concrete.

**Transaction amounts**: Follow Plaid convention — positive = expense (debit), negative = income (credit).

**Auth flow**: All protected API routes call `getAuthUser(req)` which throws if token is invalid. Mobile `api.ts` auto-refreshes tokens on 401 before retrying.

## Environment (Windows) — read before running commands

- **Put the npm global bin on PATH.** `pnpm`, `eas`, and `npx` live in
  `C:\Users\tymed\AppData\Roaming\npm`, which is **not** on PATH by default — so commands
  fail with `'pnpm' is not recognized` / `'eas' is not recognized`. The durable fix is to
  add that directory to your Windows PATH once. Until then, prefix commands with:
  ```bash
  export PATH="$PATH:/c/Users/tymed/AppData/Roaming/npm"
  ```
  (This prefix was re-typed hundreds of times across sessions purely because PATH wasn't
  set — fix it at the source rather than repeating it.)
- **Run pnpm/turbo commands from the repo root**, not from `apps/mobile` or `apps/api`,
  unless a command explicitly says otherwise. Assuming the cwd is a subdir causes
  `cd: apps/mobile: No such file or directory` and doubled-path errors.
- **Set `PYTHONUTF8=1`** if you run any Python helper — the Windows cp1252 console throws
  `UnicodeEncodeError` on unicode otherwise.
- **Don't use `sleep` to wait** (the sandbox blocks it); use the Monitor tool / an
  until-loop to poll for a build or server to be ready.

## iOS release (EAS) → TestFlight → App Store

The core release loop, run from the mobile app:

```bash
cd apps/mobile
eas build  --profile production --platform ios --non-interactive
eas submit --platform ios --latest --non-interactive
```

- **Build numbers auto-increment.** A "failed submission" caused by a duplicate build
  number is harmless — the next build gets a fresh number and submit works.
- **Keep `newArchEnabled: false` in `app.json` for v1.** The New Architecture code path is
  what surfaced the launch-crash chain (RN modules throwing NSExceptions at launch → RCTFatal
  → SIGABRT). Don't re-enable it without a deliberate reason.
- **`Sentry.init` must always run** (as `Sentry.init({ enabled: Boolean(dsn) })`) because
  `_layout.tsx` wraps the app in `Sentry.wrap()`, which requires an initialized client;
  gating init behind `if (dsn)` reintroduces a launch crash. Set `EXPO_PUBLIC_SENTRY_DSN`
  in the EAS **production** env for on-device crash reporting.
- **Debug launch crashes from the on-device `.ips`** files the user drops in
  `C:\Users\tymed\Downloads`. `EXPO_PUBLIC_PLAID_ENABLED=false` and RevenueCat-disabled
  (ships free) are intentional v1 launch flags.
- **EAS project is `worthlane`** (`accounts/tymedina100/projects/worthlane`, has creds +
  builds). Build via the CLI, **not** the stray "Vantage" org project's "Build from
  GitHub". App Store Connect app id is **6766112205**.

**Human-only steps (can't be done from the CLI, and not from Windows):** iOS screenshots,
the App Store Connect demo sign-in account, ICANN/domain email verification, and pressing
**Submit for Review**. Surface these for the user rather than trying to automate them.

## Cross-session continuity

Multi-day ship work loses context across resumes and orphans background EAS builds when a
session is resumed. Keep the ship-state notes in
`~/.claude/projects/C--Users-tymed-finance-app/memory/` (e.g. `worthlane-ship-state-*.md`)
updated at the end of a work session, and prefer finishing or re-launching a long build
within one session over resuming across the boundary.

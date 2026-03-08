# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**Loss aversion UX**: Budget messages always frame remaining budget as what will be *lost*, not what has been spent. See `getLossAversionMessage()` in `apps/mobile/app/(tabs)/budgets.tsx`.

**Streak logic**: `POST /streaks/checkin` extends streak if last activity was yesterday, resets to 1 if older. Dashboard auto-triggers check-in on mount.

**Nudge engine**: `generateNudgesForUser()` in `lib/nudge-engine.ts` is called on `GET /nudges`. Deduplicates by type+day. Uses loss-aversion language in all messages.

**Transaction amounts**: Follow Plaid convention — positive = expense (debit), negative = income (credit).

**Auth flow**: All protected API routes call `getAuthUser(req)` which throws if token is invalid. Mobile `api.ts` auto-refreshes tokens on 401 before retrying.

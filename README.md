# Vantage

A psychology-driven personal finance app built with Expo (React Native) and Next.js. Uses loss-aversion framing, streaks, and AI-ready nudges to help users build better financial habits.

## Prerequisites

- [Postgres.app](https://postgresapp.com) (or any PostgreSQL 14+) — must be running before starting the API
- Node.js 18+ and pnpm (`npm i -g pnpm`)
- Expo Go on your phone, or Xcode (iOS) / Android Studio (Android) for simulators

## First-time setup

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Copy and fill in API environment variables
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — at minimum set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET

# 3. Set the mobile API URL
echo "EXPO_PUBLIC_API_URL=http://localhost:3001/api" > apps/mobile/.env.local

# 4. Run database migrations
cd packages/db
DATABASE_URL="postgresql://<user>@localhost:5432/vantage" npx prisma migrate deploy
cd ../..
```

## Starting the app

Two terminals are required — both must stay open.

**Terminal 1 — API server** (port 3001):
```bash
cd apps/api && pnpm dev
```

**Terminal 2 — Mobile app** (Metro bundler, port 8081):
```bash
cd apps/mobile && pnpm dev
```

In the Metro terminal press:
- `i` — open iOS simulator
- `a` — open Android emulator
- Scan the QR code with Expo Go on your phone

## Environment variables

### `apps/api/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Random 32+ char string for access tokens |
| `JWT_REFRESH_SECRET` | Yes | Random 32+ char string for refresh tokens |
| `PLAID_CLIENT_ID` | For banking | From [Plaid dashboard](https://dashboard.plaid.com) |
| `PLAID_SECRET` | For banking | Plaid sandbox/production secret |
| `PLAID_ENV` | For banking | `sandbox` or `production` |
| `PLAID_TOKEN_ENCRYPTION_KEY` | For banking | Random 32+ char string — encrypts tokens at rest |
| `CRON_SECRET` | For cron | Secret header value for `/api/cron/nudges` |
| `RESEND_API_KEY` | For email | From [Resend dashboard](https://resend.com) |
| `EMAIL_FROM` | For email | Verified sender address (e.g. `noreply@yourdomain.com`) |

### `apps/mobile/.env.local`

| Variable | Default |
|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3001/api` |

## Password reset (local dev)

In development, no email is sent. The reset token is returned directly in the API response as `__dev_token` and printed to the API server console. Use it on the Reset Password screen.

In production, set `RESEND_API_KEY` and `EMAIL_FROM` to enable real email delivery.

## Useful commands

```bash
pnpm typecheck       # type-check all packages
pnpm test            # run API unit tests (Vitest)
pnpm db:generate     # regenerate Prisma client after schema changes
pnpm db:migrate      # apply pending migrations
pnpm db:studio       # open Prisma Studio in browser
```

## Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Mobile | Expo 51 (React Native) |
| API | Next.js 14 (API routes only) |
| Database | PostgreSQL + Prisma 5 |
| Auth | JWT — access token 15m / refresh token 30d |
| Banking | Plaid (sandbox by default) |
| Email | Resend |

## Features

- **Auth** — register, login, JWT refresh, biometric login (Face ID / Touch ID / Fingerprint), forgot/reset password with email delivery
- **Onboarding** — 3-screen post-registration flow: connect bank → create budget → set goal
- **Dashboard** — net worth, monthly income/spend, budgets, goals, streaks, nudges; skeleton loading state
- **Transactions** — filter by date range + category, search, impulse flag, detail/edit sheet, pagination
- **Budgets** — create, edit, delete; loss-aversion messaging; $0 spend guard
- **Goals** — create, edit, delete; contribution tracking; progress ring; past-due and completion states
- **Plaid** — bank linking, account sync, transaction import; duplicate item guard; tokens encrypted at rest (AES-256-GCM)
- **Nudge engine** — loss-aversion nudges: budget warnings, streak risk, goal milestones, weekly impulse summary
- **Push notifications** — Expo Push + FCM/APNs; toggle on/off from Profile
- **Cron job** — daily proactive nudge delivery via `POST /api/cron/nudges`
- **Streaks** — daily check-in, on-budget streak, no-impulse streak
- **Security** — rate limiting on auth routes, categoryId ownership validation, AES-256-GCM Plaid token encryption
- **Error handling** — React Native error boundary, per-item Plaid sync failure recovery

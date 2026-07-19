# Worthlane

Worthlane V1 is a calm, manual-first personal-finance companion. It answers
three questions without requiring a bank connection: where do I stand today,
what is coming next, and what should I enter or handle now?

Worthlane is also growing into a multi-platform product. The Expo mobile app
remains the first-class client for quick daily interactions, while a separate
desktop-first Next.js app supports deeper household planning. A hardened
Electron shell provides that planning experience as a native Windows app. Both
clients use the same API, PostgreSQL database, accounts, partner permissions,
budgets, goals, Plaid data, contracts, and financial calculation rules.

## What works in V1

- A Today snapshot: manually entered balance, this-month spending and income,
  next-seven-day obligations, and the next three items.
- Fast manual accounts and two-field expense/income entry.
- Manual bills, credit-card payments, subscriptions, and other obligations.
- Upcoming timeline grouped into overdue, today, this week, later, and recently
  paid; recurring items advance safely at month-end.
- Contextual local reminders (due date, one day before, or three days before).
- Settings for manual accounts, default reminders, notification permission,
  feature suggestions, support, and privacy.

V1 does not require Plaid, AI, RevenueCat, production push infrastructure, or
analytics. Those integrations remain isolated and disabled by default.

## Multi-platform household milestone

- New users can create an owner household and invite one existing Worthlane
  login; the target must explicitly accept from desktop or mobile.
- Account owners choose personal, summary-only, or fully shared partner access.
- Personal budgets remain private. Household category budgets are modeled as
  monthly responsibilities assigned to one partner, split equally, or split by
  exact percentages, with progress from categorized activity.
- Shared goals support equal, custom-dollar, and income-proportional plans plus
  synchronized contribution history. The demo starts with Universal Orlando.
- Desktop provides planning, personal and household management, reports,
  filtering, account privacy, and safe sync/unlink controls for existing Plaid
  connections. Native bank link/relink initiation remains in mobile.
- Refresh tokens are hash-only persisted, rotate once, revoke their family on
  replay/logout, and are invalidated across all sessions after password reset.

## Project layout

| Workspace | Role | Local address |
|---|---|---|
| `apps/mobile` | Expo mobile client for quick entry and daily review | Expo development-server address |
| `apps/desktop` | Authenticated desktop planning client | http://localhost:3003 |
| `apps/desktop-native` | Native Windows shell for the desktop planning client | Loads the configured desktop origin |
| `apps/web` | Existing public marketing, support, privacy, and terms site | http://localhost:3002 |
| `apps/api` | Shared authentication, household, financial-data, and Plaid API | http://localhost:3001/api |
| `packages/core` | Framework-free money, allocation, budget, and net-worth rules | n/a |
| `packages/contracts` | Shared runtime validation and client-safe API types | n/a |
| `packages/db` | One Prisma schema and PostgreSQL data store for every client | n/a |
| `packages/types` | Existing shared DTOs during the incremental migration | n/a |

Mobile and desktop navigation and UI stay separate. Mobile stores its session
in SecureStore. Desktop uses same-origin route handlers and secure HttpOnly
cookies, so API tokens are not exposed to browser JavaScript. Plaid credentials
and access tokens remain server-side in `apps/api`; clients receive only the
authorized financial data returned by the shared API.

The native shell does not move the BFF or session into Electron. It loads one
pinned desktop origin, keeps Node.js unavailable to page code, isolates and
sandboxes the renderer, rejects popups and unexpected navigation, denies device
permissions, and shows a local recovery page if the hosted client is unavailable.

For the architectural audit, boundaries, synchronization model, and migration
risks, see [`docs/multi-platform-architecture.md`](docs/multi-platform-architecture.md).

## Setup

Prerequisites: Node 20+ with Corepack, and PostgreSQL 14+.

~~~bash
corepack pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env.local
cp apps/desktop/.env.example apps/desktop/.env.local
# Set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, and each client API URL.

# Make the same DATABASE_URL available to Prisma, then apply and generate.
corepack pnpm --filter @worthlane/db db:migrate
corepack pnpm --filter @worthlane/db db:generate
~~~

Prisma reads `DATABASE_URL` from the shell or `packages/db/.env`; the API reads
it from `apps/api/.env`. Point both at the same database. Use
`corepack pnpm --filter @worthlane/db db:migrate:deploy` instead of `db:migrate` in a
deployed environment.

For PowerShell, a local database setup can be prepared like this:

~~~powershell
$env:DATABASE_URL="postgresql://user:password@localhost:5432/financeapp"
corepack pnpm --filter @worthlane/db db:migrate
corepack pnpm --filter @worthlane/db db:generate
~~~

### Optional synchronized household demo

The demo seed is opt-in and idempotent. It creates two separate logins linked
to one household, mock personal/shared accounts, privacy levels,
responsibilities, and the Universal Orlando shared goal. It never runs unless
`SEED_DEMO_DATA=true` is set.

~~~powershell
$env:DATABASE_URL="postgresql://user:password@localhost:5432/financeapp"
$env:SEED_DEMO_DATA="true"
corepack pnpm --filter @worthlane/db db:seed
~~~

Demo credentials:

| Person | Email | Password |
|---|---|---|
| Tyler | `tyler.demo@worthlane.local` | `WorthlaneDemo!2026` |
| Rachel | `rachel.demo@worthlane.local` | `WorthlaneDemo!2026` |

After starting the API and desktop app, sign in at
http://localhost:3003/login. Both users read and update the same persisted
household through the shared API. For a read-only UI preview that does not need
PostgreSQL or authentication, open http://localhost:3003/demo; changes made in
that preview are intentionally not persisted.

With the API running, verify both logins, synchronized household state, and
caller-relative privacy:

~~~powershell
corepack pnpm smoke:household-demo

# Also perform and clean up a cross-user synchronization mutation:
$env:WORTHLANE_SMOKE_MUTATE="true"
corepack pnpm smoke:household-demo
~~~

## Run locally

Start each client you need in a separate terminal:

~~~bash
corepack pnpm --filter @worthlane/api dev
corepack pnpm --filter @worthlane/mobile dev
corepack pnpm --filter @worthlane/desktop dev

# Optional public marketing/legal site:
corepack pnpm --filter @worthlane/web dev
~~~

Use an iOS simulator, Android emulator, or Expo development build for mobile.
The desktop server connects to the API through its server-only
`WORTHLANE_API_URL`; the browser talks only to same-origin desktop routes.
After login, desktop checks pending invitations first. A login with neither an
invitation nor an active household is sent to `/household/setup`.

### Native Windows desktop app

For native development, start the API in one terminal, then launch the shell
from the repository root. The native command starts `apps/desktop` on
`127.0.0.1:3003` when that address is not already serving Worthlane.

~~~powershell
corepack pnpm --filter @worthlane/api dev
corepack pnpm desktop:native:dev
~~~

Create an unpacked, local-only Windows build for native-shell QA with:

~~~powershell
corepack pnpm desktop:native:pack:local
~~~

The executable is written to
`apps/desktop-native/release/win-unpacked/Worthlane.exe`. It is deliberately
pinned to `http://127.0.0.1:3003`, so keep the desktop Next server running; this
build is for local testing, not distribution. Packaging automatically verifies
the archived runtime files and hardened Electron fuses. Re-run that gate with
`corepack pnpm desktop:native:verify` if you need to inspect an existing build.

A production installer must point at a separately deployed `apps/desktop`
origin. That origin is the same-origin Next.js UI/BFF that owns the secure
HttpOnly session cookies and proxies allowlisted requests to `apps/api`.
Production packaging rejects HTTP, credentials, query strings, and fragments.

~~~powershell
$env:WORTHLANE_DESKTOP_URL="https://desktop.example.com"
corepack pnpm desktop:native:dist
~~~

The installer is written as
`apps/desktop-native/release/Worthlane-Setup-<version>-x64.exe`. Configure a
trusted Windows code-signing certificate in the release environment before
external distribution; do not store certificate material in this repository.
An unsigned installer can trigger Microsoft Defender SmartScreen warnings.
The manual **Desktop release** GitHub Actions workflow performs the same hosted
origin check, Windows packaging, archive/fuse verification, and installer
upload. Configure `WINDOWS_CSC_LINK` and `WINDOWS_CSC_KEY_PASSWORD` as repository
secrets when signed distribution is ready.

## Environment variables

Required for V1:

| Location | Variable | Purpose |
|---|---|---|
| API | DATABASE_URL | PostgreSQL connection string |
| API | JWT_SECRET, JWT_REFRESH_SECRET | 32+ character JWT secrets |
| Mobile | EXPO_PUBLIC_API_URL | API URL, such as http://localhost:3001/api |
| Desktop | WORTHLANE_API_URL | Server-only API URL, such as http://localhost:3001/api |
| Native desktop build | WORTHLANE_DESKTOP_URL | Hosted HTTPS `apps/desktop` origin; required only by `desktop:native:dist` |
| Database/seed shell | DATABASE_URL | The same PostgreSQL database used by the API |
| Database/seed shell | SEED_DEMO_DATA | Set to `true` only when creating the demo household |

Optional integrations:

| Variable | Default | Notes |
|---|---|---|
| EXPO_PUBLIC_PLAID_ENABLED | false | Enables existing Plaid flows for later testing. |
| PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV | unset | Server-only Plaid credentials; required only for bank linking/sync. |
| PLAID_WEB_REDIRECT_URI | unset | Optional API redirect for a future desktop Plaid Link Web flow. |
| EXPO_PUBLIC_ENABLE_AI | false | Keeps the existing assistant outside V1. |
| EXPO_PUBLIC_ENABLE_PAYWALL | false | Keeps RevenueCat/paywalls outside V1. |
| EXPO_PUBLIC_REVENUECAT_IOS_KEY | unset | Used only when the paywall flag is enabled. |
| EXPO_PUBLIC_POSTHOG_KEY, POSTHOG_PROJECT_KEY | unset | Optional analytics; V1 does not capture financial details. |
| EXPO_PUBLIC_SENTRY_DSN, SENTRY_DSN | unset | Optional error reporting. |

Plaid server variables are optional and are not needed for V1.

## Notifications

Reminders are local Expo notifications. They are requested only when a person
enables reminders in Settings or saves an upcoming item using a reminder.
To test: add a future upcoming item, select a default timing in Settings, then
confirm the OS permission prompt. Editing, paying, deactivating, or deleting
an item cancels its previously scheduled local reminder.

## Quality checks

~~~bash
corepack pnpm --filter @worthlane/db db:generate
corepack pnpm typecheck
corepack pnpm --filter @worthlane/core test
corepack pnpm --filter @worthlane/contracts test
corepack pnpm --filter @worthlane/api test
corepack pnpm --filter @worthlane/api build
corepack pnpm --filter @worthlane/desktop build
corepack pnpm --filter @worthlane/desktop-native typecheck
corepack pnpm --filter @worthlane/desktop-native test
corepack pnpm --filter @worthlane/web build
corepack pnpm --filter @worthlane/mobile exec expo export --platform ios --output-dir .tmp/mobile-export

# Requires migrated/seeded PostgreSQL and a running API:
corepack pnpm smoke:household-demo
~~~

Generation, typechecks, unit tests, and builds use a syntactically valid
`DATABASE_URL` but do not require a running database. Applying migrations,
seeding, and checking cross-client persisted updates do require PostgreSQL.

## Roadmap

### V1

- Today dashboard
- Manual transactions
- Manual bills and card due dates
- Upcoming timeline
- Reminders
- Feature suggestions

### V1.1

- Desktop Plaid Link Web and relink initiation
- PostgreSQL-backed CI integration and client-level end-to-end tests
- Imported transaction reconciliation
- Recurring-charge detection connected to real transactions

### V1.2

- AI insights
- Personalized recommendations
- Debt payoff guidance
- Spending-change suggestions
- Explainable, nonjudgmental financial coaching

## Known V1 limitations

Manual writes require an API connection; V1 retains cached query data for
readability but does not queue offline writes. The quick-add screen uses a
date-only field until a native date picker is introduced. Local notifications
depend on the OS and cannot be guaranteed after an app is uninstalled or
system-level notifications are disabled.

Desktop can sync or unlink existing Plaid connections but intentionally sends
new link/relink initiation to mobile until Plaid Link Web is implemented. The
initial household sync model uses refetch-on-focus plus 60-second desktop
polling rather than realtime sockets. Physical iOS interaction must be verified
on macOS or a device; Windows CI/local validation uses an Expo production iOS
bundle export. A distributable native desktop installer additionally depends on
a deployed HTTPS desktop BFF origin and release code signing; the local package
command does not replace either requirement.

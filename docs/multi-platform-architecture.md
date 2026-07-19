# Worthlane multi-platform architecture

Status: native Windows shell implemented; production hosting and signing remain release prerequisites
Last updated: 2026-07-18

## Outcome

Worthlane is one product with one PostgreSQL database and one authoritative API,
presented through distinct mobile and desktop product surfaces:

- `apps/mobile` remains the Expo/React Native client for quick daily checks,
  entry, reminders, accounts, personal budgets/goals, and compact household
  progress.
- `apps/desktop` is a separate Next.js desktop-first planning UI and same-origin
  backend-for-frontend (BFF), with a configurable dashboard, planning views,
  account privacy, responsibility and goal management, reports, filters, and
  keyboard navigation.
- `apps/desktop-native` is a hardened Electron shell that presents that desktop
  origin in a native Windows window without duplicating finance or session
  logic.
- `apps/api` owns authentication, authorization, financial data, Plaid,
  household rules, calculations, and persistence for both clients.
- `apps/web` remains the public marketing/legal site and is not the desktop
  product.

There is no second database, client-owned ledger, duplicated Plaid connection,
or shared React component layer.

## Repository audit and implemented changes

### Mobile

The existing app uses Expo SDK 54, React Native, Expo Router, TanStack Query,
Zustand, and SecureStore. Its existing Today, transactions, upcoming bills,
accounts, personal budgets, personal goals, reports, quick-add, profile,
notifications, and optional native integrations remain intact.

The additive household screen reads the same caller-scoped household summary as
desktop, shows permitted accounts, responsibility progress, shared goals, and
supports quick goal contributions. Dashboard shortcuts keep personal Budgets,
Goals, and Household reachable without replacing the compact four-tab layout.
New users can create an owner household; invited users can review and accept an
invitation before an active household exists.

### API and authentication

The Next.js API continues to use Bearer access tokens and consistent `{ data }`
or `{ error }` envelopes. Access JWTs expire in 15 minutes. Refresh credentials
expire in 30 days and now map to persisted `RefreshSession` rows containing only
SHA-256 token digests.

Refresh is one-time rotation. A conditional database update is the race boundary;
replay or a lost rotation race revokes the full token family. Logout revokes the
current family, password reset and account deletion revoke all user sessions,
and clients clear private caches on identity changes. Mobile and desktop both use
single-flight refresh behavior so concurrent 401s do not reuse a credential.

Desktop tokens stay in `Secure`, `HttpOnly`, `SameSite=Lax`, path-root cookies.
Browser JavaScript never receives API tokens. Desktop mutation routes require an
exact same-origin `Origin` and `application/json`, validate their bodies, and
proxy only allowlisted API paths.

Every desktop response carries a restrictive Content Security Policy. Worthlane
cannot be framed, object embedding and unnecessary device APIs are disabled, and
browser connections default to same-origin. The only external script, frame, and
network exceptions are Plaid's documented Link Web endpoints; development alone
adds localhost WebSockets and eval for Next.js hot reload.

### Database

`packages/db` remains the only Prisma schema and database boundary. Existing
personal ownership columns were preserved. Additive models provide:

- `Household` settings, including timezone and currency;
- `HouseholdMember` roles, invitation lifecycle, display name, and optional
  income basis;
- per-account household access grants;
- household responsibility/category budgets and allocation rows;
- shared goals, participants, and contribution history;
- persisted refresh sessions.

A partial unique index permits at most one `ACTIVE` household membership per
user. Household creation and invitation acceptance use serializable transactions.
Account deletion transfers ownership and active responsibility/goal plans to the
remaining partner, removes stale access, preserves immutable contribution
attribution, and dissolves a one-person household when its last user is deleted.

### Plaid

Plaid client secrets and encrypted access tokens remain API-only. Both clients
read the same canonical user-owned Plaid items, accounts, and transactions.
Mobile retains native link/relink initiation. Desktop can inspect connection
health and safely sync or unlink existing connections through same-origin BFF
routes; only an internal item ID reaches browser code. The API supports a `web`
link-token platform for future Plaid Link Web work, but the desktop intentionally
does not claim that link initiation is complete.

### Native Windows shell and production topology

The Electron workspace is intentionally a shell rather than another web server.
It does not embed API credentials, copy refresh tokens into renderer storage, or
ship a second persistence layer. Renderer Node.js integration is disabled;
context isolation, Chromium sandboxing, web security, and ASAR packaging are
enabled. The shell pins navigation to the configured Worthlane origin, rejects
new windows and webviews, denies device-permission requests, disables packaged
developer shortcuts, and permits only Worthlane privacy, terms, and support URLs
to open in the system browser. Packaged builds also flip Electron fuses for cookie
encryption, ASAR integrity, and Node/inspection restrictions.

Production keeps the existing trusted server boundary:

```text
Worthlane.exe -> HTTPS apps/desktop UI + BFF -> apps/api -> PostgreSQL
```

The hosted `apps/desktop` deployment owns the secure HttpOnly cookies and sends
server-to-server requests using `WORTHLANE_API_URL`. The browser/Electron renderer
continues to call only same-origin routes. A packaged client therefore cannot be
configured to load `apps/api` directly.

Development uses `corepack pnpm desktop:native:dev`. An unpacked QA build can be
created with `corepack pnpm desktop:native:pack:local`; it loads
`http://127.0.0.1:3003` and writes
`apps/desktop-native/release/win-unpacked/Worthlane.exe`, so it is not a
distributable release. `corepack pnpm desktop:native:dist` requires
`WORTHLANE_DESKTOP_URL` to be the deployed HTTPS desktop origin and writes
`apps/desktop-native/release/Worthlane-Setup-<version>-x64.exe`.

Windows release signing is an operational prerequisite, not a repository
secret. Configure a trusted code-signing certificate in the protected release
environment before distribution; an unsigned build can produce SmartScreen
warnings even when its application code is unchanged.

## Project boundaries

```text
apps/
  api/          authentication, authorization, Plaid, and persistence orchestration
  desktop/      desktop-specific Next.js planning UI and same-origin BFF
  desktop-native/ hardened Electron shell for the hosted desktop origin
  mobile/       Expo navigation, native integrations, and quick-interaction UI
  web/          public marketing, support, privacy, and terms

packages/
  contracts/    Zod request/response schemas and inferred client-safe types
  core/         framework-free money, budget, allocation, date, and net-worth rules
  db/           server-only Prisma client, migrations, and seed
  types/        existing shared DTOs retained during incremental migration
```

`packages/core` and `packages/contracts` do not import React, Next.js, Expo,
React Native, Prisma, SecureStore, or browser APIs. Platform navigation, token
storage, HTTP adapters, layouts, controls, and charts remain client-specific.

## Household, privacy, and consent

Each partner uses a separate `User` login. A user without a household can create
one and becomes its owner. The owner sends an invitation to an existing login;
the API returns a generic pending response to avoid account enumeration. The
target login must explicitly accept within seven days. Pending invitations do
not grant access, and a household is limited to two active/pending members.

Account visibility is caller-relative:

- `PERSONAL`: only the owner receives the account or activity.
- `SUMMARY`: the partner receives aggregate assets/liabilities/net worth, never
  account identity or transactions.
- `SHARED`: the active partner can receive authorized account detail and recent
  transactions.

Membership alone grants no account detail. Owners update their own account
visibility; every account-detail API check independently resolves ownership or
an active `SHARED` grant.

## Budgets, responsibilities, and goals

Personal `Budget` records remain private to one user. The V1 shared monthly
budget is represented by `HouseholdResponsibility`: one category, one monthly
amount, progress from permitted category activity, and allocations to Tyler,
Rachel, equal split, or exact percentages. This keeps personal and household
budget scopes distinct while avoiding per-purchase reimbursement. Only one active
household responsibility can own a category.

Shared goals use one household record and an append-only contribution ledger.
Plans support equal, custom-dollar, and income-proportional contributions. Owners
can configure positive member income bases when selecting proportional mode.
Targets cannot fall below recorded contributions, and unsafe reallocation of an
active contributing participant is rejected. Universal Orlando is the seeded
example.

All allocation and progress math uses integer minor units or Prisma Decimal at
the persistence boundary. `packages/core` owns deterministic remainder-cent
allocation, budget progress, goal allocation, net-worth sign behavior, and
household month boundaries. Clients format results but do not recalculate policy.

## Synchronization

Mobile and desktop read and mutate the same API records in the same database.
Mutations return canonical resources and household timestamps. Mobile invalidates
user-scoped TanStack Query keys. Desktop reloads the workspace after mutations,
polls the active view every 60 seconds, and refreshes on focus. No realtime socket
or second ledger is required for this milestone.

The opt-in demo seed creates Tyler and Rachel as separate logins, one household,
caller-relative account privacy, categorized household responsibilities, and the
Universal Orlando goal. `scripts/smoke-household-demo.mjs` authenticates both
users and verifies that they read the same household revision and shared-goal
state while private partner detail remains absent. With
`WORTHLANE_SMOKE_MUTATE=true`, it also creates a temporary responsibility as
Tyler, verifies Rachel observes it, deletes it, verifies both views are clean,
and revokes both smoke sessions.

## Migration and operational risks

- Existing `userId` ownership was retained; household scope is additive.
- All preexisting accounts default to personal until an owner saves a grant.
- One active household per login is enforced both in service logic and by a
  database index.
- Hash-only refresh persistence means migration deployment must precede login on
  the new API build.
- Household timezone drives monthly responsibility windows, including DST edges.
- Plaid ownership is never cloned; partner access is a permission over canonical
  data.
- Desktop link/relink initiation remains a documented mobile boundary until
  Plaid Link Web and public-token exchange BFF routes are implemented.
- A production native installer requires a deployed HTTPS `apps/desktop` BFF
  origin; the shell intentionally rejects HTTP and localhost in release builds.
- The installer must be code-signed in a protected release environment before
  distribution. Signing keys and certificates must not be committed.
- A production release should still add PostgreSQL-backed CI integration tests
  and physical-device mobile QA; local unit/build/export checks do not replace
  those environments.

## Verification commands

From the repository root:

```powershell
corepack pnpm --filter @worthlane/db db:generate
corepack pnpm typecheck
corepack pnpm --filter @worthlane/core test
corepack pnpm --filter @worthlane/contracts test
corepack pnpm --filter @worthlane/api test
corepack pnpm --filter @worthlane/api build
corepack pnpm --filter @worthlane/desktop build
corepack pnpm --filter @worthlane/desktop-native typecheck
corepack pnpm --filter @worthlane/desktop-native test
# Local-only unpacked shell; keep apps/desktop available on 127.0.0.1:3003.
corepack pnpm desktop:native:pack:local
corepack pnpm --filter @worthlane/web build
corepack pnpm --filter @worthlane/mobile exec expo export --platform ios --output-dir .tmp/mobile-export
corepack pnpm smoke:household-demo
```

Migration deployment, seed, and smoke require the configured PostgreSQL database
and a running API. Physical iOS interaction remains a manual check on macOS or a
device; the Windows verification path uses Expo's production iOS bundle export.
The production native installer additionally requires a hosted HTTPS desktop
origin, `WORTHLANE_DESKTOP_URL`, and release code signing.

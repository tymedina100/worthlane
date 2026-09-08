# Couples-first beta evidence

## Authority and completion

The [September 8 Notion brief](https://app.notion.com/p/3d57f32d407581d9a9eafcdb4d5ac152)
is the product acceptance authority. Keep its full scope: guided solo and two-login
onboarding; consent and private finances; owned/equal/custom category budgets;
reconciled spending; Sandbox banking with manual fallback; confirmed due dates and
reminders; persisted, explainable avalanche/snowball plans; PostgreSQL and UI proof.
No milestone below alone means beta completion.

## 2026-09-08 — baseline and instruction reconciliation

- Started from freshly fetched main `39111a17e73d18719862232d93ace70890272a3a`
  on `codex/couples-beta`. Previous checkout `afc7cef` had the same tracked tree.
- Preserved pre-existing uncommitted CLAUDE.md Windows/release/continuity notes.
  Added current authority and replaced loss-aversion mandates in both agent files.
- Updated README and product principles to include required banking, budgeting and
  debt capabilities, separate implemented foundation from beta acceptance, and
  preserve calm language and architecture.
- `corepack pnpm --filter @worthlane/core --filter @worthlane/contracts --filter @worthlane/api test`
  passed: core 29, contracts 8, API 136 (173 total). API database calls are mocked;
  these results do not establish persistence.
- `corepack pnpm typecheck` failed before TypeScript: Turbo resolved the bundled
  fallback pnpm shim and attempted dependency removal without a TTY.
- `corepack pnpm -r --if-present typecheck` passed all workspace typecheck scripts.
  Use this command for local typechecks until the Turbo PATH issue is resolved;
  do not purge dependencies merely to satisfy the fallback shim.
- Located PostgreSQL 17 initdb/pg_ctl binaries locally. No database was started or
  migrated, and no credentials or production services were exercised.

## Evidence gaps and next action

1. Build an isolated local PostgreSQL test harness, apply migrations only there,
   and test registration, solo creation, invitation/acceptance and reload with two
   distinct users. Existing smoke script assumes seeded users; it is insufficient
   for the onboarding acceptance journey.
2. Inspect and fix category accounting: current household summary filters amount
   greater than zero (refunds excluded), and applies spending by payer against
   that payer's allocation. Verify responsibility versus payer semantics with the
   acceptance fixtures before changing contracts/UI. Preserve visibility filtering;
   never fix coherence by revealing a private partner transaction.
3. Cover groceries 600 at 50/50, utilities 150 owned by one member, rent 1700 at
   60/40; odd cents, 0/100 shares, refunds, overspending, month boundaries, edited
   splits/history, and no duplicated household totals in persistent two-user tests.
4. Complete Sandbox connect/reconnect/sync/recovery/unlink and pending-to-posted,
   added/modified/removed reconciliation; label freshness/incomplete history and
   prevent duplicate imports, transfers, repayments and joint-account counting.
5. Implement verified due-date sources, distinguish card current/statement/minimum
   values, and saved debt estimates including zero APR, promotions, insufficient
   payments, cent rounding and disclosed assumptions.
6. Run interactive solo/two-user UI journeys and all regression builds, mobile
   export and relevant native tests. None has fresh evidence in this checkpoint.

Status: active; first documentation/offline baseline checkpoint completed. No
production changes or spending. Full beta acceptance remains unproven.

## 2026-09-08 — first PostgreSQL-backed journey

- Added `scripts/test-postgres.ps1`: creates a new loopback-only PostgreSQL 17
  cluster with synthetic data, applies all 12 migrations, runs the integration
  suite and stops the server. Test clusters/logs are retained under ignored `.tmp`.
  Fixed Windows process-output inheritance and process-tree waiting encountered
  while capturing launcher output; only task-created clusters were stopped.
- `./scripts/test-postgres.ps1` passed (exit 0): one composite journey covering
  three real registrations, solo setup, consent before access, wrong-user invite
  rejection, a two-member maximum, 600/150/1700 allocation fixtures, reconnect and
  fresh-login persistence, account owner-only sharing, summary-only denial of
  detail, full sharing and revocation. No Prisma or authentication mocks.
- This invokes actual Next route handlers in-process plus household services;
  it does not cover HTTP transport, cookies/BFF, logout, interactive UI, spending
  reconciliation, partner registration after an invitation, or concurrent joins.
- `corepack pnpm --filter @worthlane/api typecheck` passed.
- `corepack pnpm --filter @worthlane/api test` passed all 136 unit tests after
  separating integration tests from the default suite. `git diff --check` passed.
- Added an ephemeral PostgreSQL CI job. Remote execution remains unverified.
- Next: attach categorized transactions to these persisted fixtures and fix
  refund/payer semantics with explicit privacy scope; extend to concurrent
  invitations and full HTTP/UI journeys. Banking and debt acceptance still open.

## 2026-09-08 — responsibility independent of payer

- Household summary now allocates permitted category spending using the agreed
  responsibility plan, rather than subtracting payer activity only from that
  payer's allocation. Uses existing deterministic shared allocation rules.
- Desktop now shows individual remaining amounts; both clients label the visible
  activity scope and agreed-split behavior. Interactive layout QA remains open.
- Extended the real PostgreSQL journey: owner pays 101.01 for partner-owned
  utilities, producing 10101 applied / 4899 remaining for the partner; owner pays
  100.01 for equal groceries, producing 5000/5001 applied and 49999 total remaining.
  Both viewers agree while shared; revocation excludes private activity again.
- `./scripts/test-postgres.ps1` passed after the new assertions. API 136 unit
  tests and API/desktop/mobile typechecks passed. No production or banking calls.
- Refund classification remains unresolved: blindly subtracting all negative
  transactions would conflate refunds and income. Next add explicit spending
  classification/reconciliation, signed refund accounting, month-boundary and
  overspending fixtures, then HTTP/UI journey verification. This checkpoint does
  not establish a complete month or full beta acceptance.

## 2026-09-08 — explicit refund and exclusion storage

- Added additive migration `20260908120000_add_spending_treatment`: AUTO preserves
  legacy positive-spending behavior, REFUND explicitly includes negative credits,
  EXCLUDED omits transfers/repayments. Existing credits are not silently recast as
  refunds. Manual create and owner-only manual/imported PATCH accept treatment;
  list/create/update responses expose it. Positive refunds are rejected.
- Household summaries include confirmed refunds; signed applied spending and
  usage contracts allow net refunds greater than purchases without clamping money.
- `./scripts/test-postgres.ps1` applied 13 migrations and passed the expanded
  persisted journey: 100.01 purchase minus 20.01 refund equals 80; 900 income and
  500 excluded debit do not alter it; another 100 refund yields -20 net / 620
  remaining. Positive-refund creation returns 400.
- API 136 unit tests, contracts 8 tests, recursive workspace typechecks and
  `git diff --check` passed. Prisma regenerated locally; no live migration.
- Still incomplete: transaction-editor controls and shared client DTO fields,
  personal dashboard/report reconciliation, imported automatic classification,
  duplicate/transfer detection, date-boundary fixtures and interactive QA. Next
  carry treatment through both editing surfaces and unify all spending views;
  do not describe this backend checkpoint as complete refund UX or banking proof.

## 2026-09-08 — client treatment controls

- Existing mobile transactions (manual and imported) now offer owner-controlled
  treatment choices, show refund/excluded state and report save errors. Refund
  choice is available only for credits. Success invalidates transactions,
  dashboard, budgets and household summary queries.
- Desktop personal report rows now expose equivalent selectors through the
  existing authenticated management callback. The BFF permits only transaction
  PATCH containing a valid spendingTreatment; existing origin/session protection
  remains. Save/pending/error feedback is present and data reloads after saving.
- Desktop filtered category analysis includes confirmed refunds, excludes marked
  transfers/repayments, sums in cents and handles negative net amounts without
  negative-width bars. Shared client-local DTOs retain treatment on reload.
- Mobile and desktop typechecks and diff whitespace checks passed. Interactive
  verification remains pending: typechecks do not prove BFF transport, mobile
  dialog usability or save/reload behavior. Other personal dashboard/budget totals
  still need reconciliation. Next verify edits through HTTP/UI and unify those
  remaining aggregate queries; no full-beta completion claim.

## 2026-09-08 — personal and household refund totals agree

- Centralized spending/income query predicates. Personal budgets, dashboard,
  spending report, household summary and legacy nudge/streak/AI context queries
  now include confirmed refunds and omit excluded transfers. Income excludes
  confirmed refunds and excluded credits. Optional providers were not activated.
- Shared budget progress accepts net negative spending. Cashflow sums integer
  cents and treats refund credits as negative spending, not income.
- PostgreSQL journey now calls actual personal budget/dashboard/spending/cashflow
  handlers against the refund fixture: groceries spent -20 / remaining 620;
  overall spending 81.01; income 900; cashflow net 818.99. Matches household plan.
- `./scripts/test-postgres.ps1` passed with the final cent-summing implementation.
  Core 30 and API 136 unit tests passed; recursive workspace typechecks passed.
- Limits: this verifies treatment accounting, not identical period semantics
  (personal routes still use server-calendar dates and some include future rows).
  Weekly budget periods, household timezone alignment, stale-data indicators,
  imported automatic classification and interactive edits remain open. Next
  verify the HTTP/BFF/UI save path and repair date-period inconsistencies.

## 2026-09-08 — weekly budgets and current activity cutoff

- Added deterministic Sunday-start week ranges in shared core, including DST
  boundary handling. Personal budget and dashboard queries use the active
  household timezone (UTC before household setup) and actual weekly/monthly
  budget period. Prior-period snapshots follow the same period boundaries.
- Personal budgets and household summaries now cap applied activity at now;
  future-dated entries no longer reduce current remaining amounts.
- PostgreSQL fixture verifies a 50 weekly budget: previous-week 35 and future 100
  are excluded; current 10 produces spent 10 / remaining 40 in budgets and the
  dashboard. DST spring week and UTC-Sunday/local-Saturday cases pass core tests.
- `./scripts/test-postgres.ps1` passed; core now has 32 tests. Workspace
  typechecks and `git diff --check` passed; API regression tests were run.
- Still open: report/cashflow timezone alignment, old snapshot period labeling,
  split history, interactive classification saves, and full banking/debt/beta
  verification. No production migration or external service activation.

## 2026-09-08 — real HTTP/BFF session and refund editing

- Added optional `./scripts/test-postgres.ps1 -Http`, using a freshly migrated
  isolated cluster and local API/desktop servers, with synthetic sessions and
  optional integration credentials disabled. Task-created servers are stopped
  afterward; logs stay under ignored `.tmp`.
- Final run passed: desktop registration, HttpOnly session cookies, no access
  token in browser-facing registration JSON, anonymous PATCH denied, cross-origin
  PATCH denied, unsupported amount edit rejected by the narrow BFF, refund PATCH
  persisted through desktop GET, logout caused 401, and fresh login retained it.
- First attempt used 127.0.0.1 for desktop and received origin rejection. Harness
  now uses documented localhost desktop origin; no origin protection was relaxed.
- Both PostgreSQL journeys also passed in the final run. This is real HTTP
  transport and cookie-header evidence, not browser policy enforcement: the test
  client carries cookies explicitly. HTTPS Secure-cookie behavior, rendered UI,
  mobile controls and complete two-user HTTP/UI onboarding remain unverified.
- Next: interactive desktop/solo/two-user acceptance and fixes surfaced there,
  alongside outstanding historical split behavior, Sandbox banking and debt.

## 2026-09-08 — report month boundaries

- Spending and cashflow reports now resolve the active household timezone (UTC
  for users without a household), using shared inclusive/exclusive month ranges.
  The default report month follows that timezone. Future transactions are capped
  at now, including explicit future report requests.
- Added a real PostgreSQL boundary journey with only the JavaScript Date clock
  fixed: at 2026-09-01 02:00 UTC, Phoenix is still in August. Spending report,
  cashflow and dashboard show August spending 7; cashflow puts the prior-boundary
  3 in July and excludes future 9 at the September local boundary.
- `./scripts/test-postgres.ps1` passed both persisted journeys; API typecheck and
  `git diff --check` passed. No provider calls or production changes.
- Next priority: actual HTTP/BFF and interactive classification/save/logout
  verification. Historical snapshot/split semantics, onboarding polish, Sandbox
  banking, due-date/debt flows and full regression builds remain unfinished.

## 2026-09-08 — rendered solo onboarding and fresh category bootstrap

- Browser registration with synthetic credentials reached household setup and a
  real authenticated dashboard. Solo setup required no partner. The monthly-plan
  form saved a 600 Food & Drink responsibility, assigned 100% to the solo member,
  and the dashboard retained 600 remaining after a full browser reload.
- This check exposed two defects: a fresh migration-only database had no standard
  categories, and dashboard month labels were hardcoded to July. Added a reference
  data migration for all 16 existing standard categories, preserving prior IDs.
  Summary now carries an optional asOf timestamp; dashboard labels use its month
  in the household timezone. Browser verified September / September 2026.
- Added -Interactive to the isolated runner, retaining the local synthetic API
  and desktop for at most 15 minutes with an explicit stop-file mechanism. The
  browser tab was closed; its server ports were confirmed no longer listening.
- Final ./scripts/test-postgres.ps1 -Http passed all 14 migrations, three real
  PostgreSQL checks (including repeat category bootstrap with identical IDs and
  no demo users), and HTTP/BFF session/refund/logout persistence. Exit 0 confirmed
  database/server shutdown. Workspace typechecks and 176 unit/contract tests
  (32 core, 8 contracts, 136 API) passed; git diff --check passed.
- Browser evidence covers localhost registration, solo setup, category save and
  reload. It does not establish HTTPS deployment, two-user rendered acceptance,
  mobile/native behavior, banking or debt readiness. Screenshot inspection covered
  the desktop dashboard viewport only.
- Next: invitations currently silently ignore unregistered partners. Implement a
  consent-safe registration/join path, then verify two-user UI ownership/splits and
  privacy. Historical split policy, Sandbox banking, due-date/debt flows and full
  regression builds remain required. No production changes or spending.

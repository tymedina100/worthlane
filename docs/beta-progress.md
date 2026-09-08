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

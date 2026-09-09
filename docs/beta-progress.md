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

## 2026-09-08 — invitation before partner registration

- New invitations persist an intended email and SHA-256 hash of a random 192-bit
  private code. The owner shares the code directly; no mail provider is implied
  or activated. A recipient registers/signs in with the intended email and
  explicitly accepts. Code expiry remains seven days; reissue rotates the code.
  Raw codes are returned once to the owner and are not stored in the database.
- New invitations cannot be listed or accepted by member ID alone. Existing
  pre-migration invitations retain their original ID-based acceptance path.
  Acceptance checks the active two-member limit inside the serializable transaction.
- Desktop setup now offers code acceptance; desktop owner controls show the code.
  Mobile household setup offers code acceptance and owner invitation creation.
  These new rendered controls have typecheck evidence but await interactive QA.
- PostgreSQL journey now invites before registration, registers the partner,
  reissues without duplicating the reserved slot, rejects the superseded code,
  rejects a different login and ID-only acceptance, accepts the intended user,
  clears the token hash, and rejects a stale third-member invitation. Existing
  saved split, privacy, refund and calendar assertions still pass.
- ./scripts/test-postgres.ps1 -Http passed the new two-client BFF flow: invitation
  before registration, acceptance, private-account isolation, partner logout/login
  persistence. After adding the acceptance-time limit, ./scripts/test-postgres.ps1
  passed all three DB journeys again with exit 0 and server shutdown. API tests
  (136), contracts (8), workspace typechecks and git diff --check passed.
- One initial typecheck overlapped the dev harness rebuilding .next/types and
  failed on disappearing generated files; rerun after server shutdown passed.
- Next: interactive two-user registration/code/budget/split/save verification,
  including code display and setup navigation. Full mobile/native acceptance,
  historical split handling, Sandbox banking, due dates/debt and builds remain
  open. No production changes, emails or spending.

## 2026-09-08 — two-login browser budget acceptance

- Actual browser forms registered synthetic Alex, created a household, generated
  Sam's invitation before Sam registered, and added a 1000 manual checking account
  defaulting to Personal. After owner logout, Sam registered and entered the code
  in setup to explicitly join. Sam's dashboard showed zero visible net worth and
  no account name/detail, while Alex's fresh login showed the private 1000.
- Alex created all acceptance fixtures through the monthly-plan form: groceries
  600 equal (300 each), utilities 150 assigned to Sam, rent 1700 at 60/40
  (1020/680). Total 2450; member assignments 1320/1130. Sam's fresh login and full
  reload retained all three allocations and remaining amounts without Alex's
  private account. This used sequential separate logins in one browser profile.
- Screenshot QA found the dashboard responsibility grid overflowing its panel
  beside the goal card. Reflowed each row into heading/amount, progress, then
  member allocations; made the surrounding columns shrink to available width.
  Follow-up screenshot at the same desktop viewport showed contained amounts.
- ./scripts/test-postgres.ps1 -Interactive first passed three DB journeys and
  the HTTP/BFF suite. The tab was closed. On cleanup the session handle was gone
  and ports 55439/3301/3303 had no listeners; no servers were restarted.
  git diff --check passed. CSS-only change was verified visually, without new
  mirror tests. This is desktop localhost evidence, not HTTPS/native/mobile QA.
- Still required: interactive transaction classifications and privacy changes,
  historical split handling, Sandbox banking/reconciliation, due-date/debt plans,
  native/mobile acceptance and full regression builds. Next inspect banking flow.

## 2026-09-08 — desktop banking entry points and live Sandbox connectivity

- Added desktop Connect bank and Reconnect controls using Plaid's official CDN
  Web SDK, with cancellation/error feedback and manual fallback. Update mode
  syncs the existing Item rather than exchanging another public token. Extended
  the existing same-origin authenticated BFF with narrow Link/exchange payloads.
  Existing CSP already allows the official Plaid script/frame origins.
- Live node scripts/test-plaid-sandbox.mjs --live-sandbox passed: create Link
  token; create/exchange a synthetic Item; 14 Sandbox accounts; initial sync;
  simulate ITEM_LOGIN_REQUIRED; create update-mode token; remove task-created
  Item. Script hardcodes Sandbox base URL, requires explicit sandbox env/flag,
  never opens the app database, and logs no credentials/tokens/response bodies.
- This is direct provider evidence, not a persisted app sync or interactive
  reconnect result. Local API credentials work in Sandbox; app token encryption
  configuration still needs an isolated test key before exercising stored Items.
- ./scripts/test-postgres.ps1 -Http passed three DB journeys and HTTP suite,
  including new Link/exchange BFF auth, origin, platform and field validation.
  Desktop typecheck and git diff --check passed. No production activation.
- Next: isolated persistent app/Sandbox connect-sync-error-unlink and actual
  desktop Link/reconnect UI. OAuth redirect resumption, native autolinking and
  mobile Link remain incomplete; do not claim broad bank coverage yet. Preserve
  manual fallback while proving added/modified/removed/pending reconciliation.
- References: https://plaid.com/docs/link/web/ (CDN SDK),
  https://plaid.com/docs/link/update-mode/ (no re-exchange in update mode),
  https://plaid.com/docs/api/sandbox/ (test Items and login-required simulation).

## 2026-09-08 — persisted application Sandbox banking

- Added ./scripts/test-postgres.ps1 -Sandbox. It creates the isolated database,
  runs ordinary DB journeys, then loads local Sandbox credentials only into a
  child process with a random temporary encryption key. No production database
  or durable environment file is changed. Sandbox config selects only its own
  test file; live calls remain outside the ordinary offline suite.
- Final run passed three existing PostgreSQL journeys plus the new app-route
  Sandbox test: register separate users, exchange synthetic Item, persist AES-GCM
  encrypted token/accounts, import nonempty transaction history, repeat sync with
  unchanged row count, reject another user's sync/relink/unlink, force login
  required, persist needsRelink/error code, issue update Link token, unlink both
  upstream and local Item/accounts/transactions. Exit 0 and DB shutdown confirmed.
- First run found another-user sync returned empty success; fixed requested
  missing/non-owned Item to return 404. Also fixed Vitest config array merging
  accidentally rerunning fresh-DB checks after population. Task-created provider
  Item cleanup ran in the failure path; final test used normal app unlink.
- API unit suite (136), API typecheck and git diff --check passed. Test diagnostics
  identify stages without exposing provider headers, tokens or response bodies.
- This verifies app route + PostgreSQL + live Sandbox, not browser Link success
  or completed interactive reconnect. Still required: added/modified/removed and
  pending reconciliation, joint-account/import dedupe, freshness/history signals,
  OAuth resumption, native banking, due dates/debt and full beta regression gates.
- Next: interactive desktop Sandbox flow with a separately scoped encryption key,
  and deterministic reconciliation coverage. Native/mobile remains unverified.

## 2026-09-08 — atomic posted-transaction reconciliation

- Replaced independent transaction writes/cursor update with one serializable
  batch. A stale cursor returns a retryable conflict without overwriting a newer
  successful Item state. Unknown accounts fail the batch rather than silently
  advancing past unimported activity; owner collisions roll back the entire batch.
- Bank spending now uses posted transactions. Pending events are excluded, and
  posted replacements remove any legacy pending row by pending_transaction_id.
  Desktop banking copy makes this posted-only scope explicit. Pending holds are
  not a separate supported spending view in this beta.
- Added categoryOverridden tracking to user category edits so future sync does
  not overwrite them. The migration conservatively preserves existing categorized
  imports because earlier rows did not distinguish manual category edits. Notes
  and explicit spending treatment remain preserved during modified events.
- New real-PostgreSQL deterministic batch coverage verifies pending exclusion,
  legacy pending replacement, replay without duplicate rows, modified amount,
  user-category/note/treatment preservation, stale-cursor rejection, full rollback
  on a later ownership collision, and owner-scoped removals.
- Final ./scripts/test-postgres.ps1 -Sandbox passed all 16 migrations, four DB
  tests and live persisted Sandbox banking, including Item cleanup; exit 0 and
  database shutdown confirmed. API unit tests (136), workspace typechecks and
  git diff --check passed. No production migration or activation.
- Still required: bank-date timezone semantics, transfer/card-payment and joint
  account/import dedupe, incomplete-history/freshness signals, interactive Link
  recovery, OAuth/native banking, historical splits, debt/due dates and full builds.

## 2026-09-08 — bank calendar dates and money movement defaults

- Save the provider calendar posting date independently and normalize its instant
  to the active household timezone (UTC before household setup). On create/join,
  rebase bank dates within the onboarding transaction; manual timestamps stay put.
  Sync reads membership inside its serializable transaction.
- New imports labeled TRANSFER_IN/TRANSFER_OUT or credit card payment default to
  EXCLUDED, preventing movement from inflating spending or income. Mortgage
  payments remain expenses and wage credits remain income. Explicit user treatment
  edits survive later sync. Desktop copy explains the editable defaults.
- Migration preserves treatment for all historical imports conservatively because
  older rows cannot distinguish user edits; historical AUTO movements still need
  user review. Fresh migration deployment tested; populated legacy migration and
  invitation-acceptance rebasing need dedicated additional fixtures.
- Source: https://plaid.com/documents/transactions-personal-finance-category-taxonomy.csv
- Verification: core37/API136 tests and recursive workspace typechecks passed.
  test-postgres.ps1 -Sandbox passed 17 migrations, 4 DB integration tests and the
  live persisted Sandbox test, including cleanup and confirmed DB shutdown.
  DB assertions cover default movement totals, preserved overrides, household
  date rebasing, manual timestamp preservation and subsequent synced dates.
  git diff --check passed. Root db:generate hit the known fallback pnpm shim;
  direct corepack pnpm --filter @worthlane/db db:generate succeeded.
- Remaining: interactive Link/recovery, OAuth/native, joint/manual-import dedupe,
  freshness/history indicators, historical splits, due dates/debt and full builds.
  No production migration, deployment or spending.

## 2026-09-08 — bank history coverage and retrieval notices

- Persist Plaid transactions_update_status in the same atomic batch as cursor and
  transaction changes. Unknown/absent provider values fail conservatively to
  UNKNOWN; existing Items migrate to UNKNOWN until verified by another sync.
- Accounts API exposes owner-only history status and calm notices. Desktop
  planning/account views and mobile dashboard/profile display loading, unconfirmed,
  stale retrieval, connection attention and limited-history notices. Successful
  retrieval does not claim the bank itself is current or guarantee full months.
- Source: https://plaid.com/docs/api/products/transactions/ (sync response status).
- Passed core39/API136 unit tests, recursive workspace typechecks and diff check.
  test-postgres.ps1 -Sandbox passed 18 migrations, 4 DB tests and persisted Sandbox
  lifecycle/cleanup. DB proves partial-history persistence and stale-cursor rejection
  cannot overwrite it. Sandbox verifies accounts notice serialization and stranger
  isolation. Database shutdown confirmed; no production activity.
- Remaining: rendered notice QA, dedicated desktop overview and all mobile spending
  surface coverage, privacy-safe partner permitted-account coverage warnings,
  provider last-successful-update timestamps, joint/manual-import deduplication,
  interactive Link/recovery/OAuth/native, debt/due dates and full acceptance builds.

## 2026-09-08 — privacy-scoped household banking notices

- Household summary now includes bank notices only for the caller's accounts and
  partner accounts explicitly shared with transaction detail. Summary-only and
  private accounts do not disclose connection existence, health or history state.
- Desktop overview and planning views, plus mobile household dashboard snapshot,
  show these permission-filtered notices alongside the plan. Removed duplicated
  owner notices from those views. Manual accounts produce no bank notice.
- Verified with 4 PostgreSQL integration tests after 18 migrations; the two-user
  journey asserts owner notice, shared notice, summary/private exclusion and
  removal after revocation. Initial run caught fixture source contamination of
  the later manual-entry test; fixture cleanup fixed it and final run passed.
  API136/contracts8 and workspace typechecks passed. Database shutdown confirmed.
- Still pending: rendered notice QA and remaining mobile spending screens,
  provider update timestamps, interactive Link/OAuth/native, joint/manual-import
  dedupe, historical split behavior, debt/due dates and full acceptance builds.
  No new live Sandbox run was needed for this permission-only change.

## 2026-09-08 — deterministic debt-payoff calculation foundation

- Added shared avalanche/snowball estimator with explicit monthly start, total
  payment budget, debt balances/APRs/minimums and optional promo expiry date.
  Pays all entered minimums before strategy-directed extra; redirects unused
  payoff amounts within the month. Fixed budget continues after debts pay off.
- Integer cents and BigInt rational monthly interest give half-up cent rounding.
  Promo expiry prorates APR by days in that month. Exposes per-debt monthly
  payments/interest/balances, payoff month, total interest, minimum shortfalls and
  horizon/non-principal-reduction warnings. No invented payoff date on failure.
- Exported assumptions for the upcoming UI: beginning-balance APR/12 model,
  end-month payments, fixed minimums, no new charges/fees, no deferred interest.
  This is an estimate, not lender daily-accrual or payment execution.
- Strategy reference: https://www.consumerfinance.gov/archive/blog/how-reduce-your-debt/
- Core tests pass (47 total, including 8 payoff fixtures): zero APR/final cap,
  strategy comparison/conservation, cent rounding, promo date and changing priority,
  minimum shortfall, non-amortizing/zero payments, stable ties and invalid inputs.
  Workspace typechecks and diff check pass. API lower target required BigInt(2)
  instead of a bigint literal; resolved without changing app target settings.
- Next: validated persistent owned debt-plan API and edit/save/revisit UI, with
  explicit balances/statement/minimum/due-date semantics. Liabilities/manual due
  dates, banking recovery/dedupe, rendered QA and full beta acceptance remain open.

## 2026-09-08 — persistent owner-only debt plans

- Added normalized DebtPlan/DebtPlanEntry storage; database money remains Decimal
  while validated API inputs use exact cents. Current balance, statement balance,
  minimum payment, APR, due date and promo date/rate are separate fields.
- Authenticated API supports create/list/get/full edit. Ownership is derived only
  from the session. User-supplied owner fields are rejected; other users get 404.
  Edits claim a revision and replace entries atomically, rejecting stale writers409.
- Reopened plans recompute calculation-version1 estimates from saved manual inputs
  and return assumptions. Insufficient-payment plans remain saveable with warnings;
  unsupported calculation ranges return422. Due dates here are manual plan input,
  not yet connected to obligation reminders or bank-confirmed Liabilities.
- Passed 19 migrations and5 PostgreSQL integration tests, including saved plan
  reopen after login, exact statement/current/minimum/date separation, owner
  isolation, stale-edit preservation, entry replacement and shortfall persistence.
  API136/contracts8 and workspace typechecks passed; database shutdown confirmed.
- Next: desktop BFF and editable save/revisit UI, then mobile and obligation links.
  Bank Liabilities/recovery/native/dedupe and broad beta verification remain open.

## 2026-09-08 — desktop debt-plan editor and BFF

- Added private debt editor inside Goals: multiple named debts, separate current/
  statement/minimum/APR/due fields, optional promo expiry, total monthly budget,
  avalanche/snowball selection, preview, save, reopen and debt removal.
- Shows estimated payoff/interest, shortfall and horizon warnings, monthly totals,
  plus explicit model assumptions. Edits clear stale estimates; preview is labeled
  unsaved. Revision conflicts retain entered data with a reload message.
- Dedicated narrow BFF handles collection/read/edit, validates shared contracts,
  uses existing HttpOnly session handling and same-origin mutation guard.
- test-postgres.ps1 -Http passed19 migrations,5DB tests and real HTTP/BFF debt
  create/read/edit, owner isolation, rejected extra fields and stale revision409.
  Existing HTTP registration/refund/consent checks also passed. Servers/database
  stopped; final workspace typechecks passed.
- Rendered interactive editor acceptance still pending. Next: browser QA including
  new/reopen/edit/preview and small-width layout; per-debt payment presentation,
  mobile plan UI and obligations integration. Banking recovery/dedupe/native and
  full beta acceptance remain open. No production changes.

## 2026-09-08 — interactive desktop debt-plan acceptance checkpoint

- Ran test-postgres.ps1 -Interactive:19 migrations,5DB tests and HTTP/BFF checks
  passed, then used the real in-app browser on localhost3303 with a fresh synthetic
  login and newly created private household (Alex / Debt UI household).
- Actual browser UI: Goals -> named UI payoff check, current balance100, minimum10,
  zero APR, monthly budget30. Preview visibly returned December2026 payoff, zero
  interest and100 total payments, with an unsaved-preview notice. Save succeeded.
- Reload -> Open saved plan restored inputs and December estimate. Edited payment
  budget to50 and saved; result changed to October2026. Expanded monthly schedule
  showed September50/remaining50 and October50/remaining0.
- At390x844, screenshot inspection showed readable actions/results/schedule without
  clipped schedule columns. Restored viewport. Signed out, signed back in and
  reopened saved plan: October2026 result confirmed in the rendered page.
- Stopped exact interactive runner via its stop file; process exit0 and database
  shutdown confirmed. Synthetic-only; no deployment, spending or live bank data.
- This proves basic one-debt desktop preview/save/edit/reopen/fresh-session behavior.
  Multi-debt/promo/conflict UI cases, per-debt payment guidance, mobile plans,
  obligation integration and broader banking/beta acceptance remain unfinished.

## 2026-09-08 — mobile saved debt-plan flow and payment guidance

- Added authenticated mobile debt-plan screen linked from Goals. Uses shared
  calculator/contracts and existing refresh-token API client. Supports named debts,
  separate monetary/date fields, promotions, preview/save/reopen, revision errors,
  avalanche/snowball, assumptions and monthly schedule. Draft inputs survive errors.
- User-keyed editor remounts on identity changes; saved-plan query is scoped by
  userId. No household sharing is inferred. Both mobile and desktop now display
  first-month payment per debt, not only a total monthly payment.
- Added only mobile's workspace dependency on core. pnpm add initially recalculated
  unrelated API peers and disrupted local links; restored prior lock resolutions,
  retained the core link and ran offline frozen-lockfile install successfully.
- Passed workspace typechecks, core47 tests and iOS Expo export (1939 modules,
  Hermes bundle, exit0) to ignored .tmp/debt-mobile-export. This is bundle proof,
  not iPhone/simulator interaction or app-store distribution.
- Remaining: native runtime/UI acceptance, multi-debt/promo/conflict interaction,
  per-month debt detail presentation, obligations/Liabilities integration, banking
  recovery/OAuth/native/dedupe and full beta acceptance. No production release.

## 2026-09-08 — explicit debt minimums into Upcoming

- Added owner-only saved-debt action to create a one-date Upcoming obligation from
  its confirmed due date and positive minimum. UI shows the exact saved amount/date
  and states that unsaved edits are not used; this never executes a payment.
- Plan-row revision claim serializes against edits. Stable hashed plan/entry/date
  key makes repeated clicks idempotent and preserves existing paid/edited items.
  New items are non-recurring with reminders NONE; no future due dates inferred.
- Desktop BFF and desktop/mobile debt-plan controls expose the action. Mobile can
  navigate to its existing Upcoming manager. Desktop Upcoming management is still
  an open surface gap and must be completed for a coherent desktop journey.
- Passed20 migrations and5 PostgreSQL tests: create, repeat without duplicates,
  paid-state preservation, stale-plan409, owner isolation and stored date/amount.
  Workspace typechecks and diff check passed; exact DB shutdown confirmed.
- Still required: rendered action QA, desktop Upcoming manager, household-local
  due status and reminder verification, Liabilities sources, mobile runtime,
  banking recovery/native/dedupe and full integrated beta acceptance.

## 2026-09-08 — household-calendar due dates and recurrence anchors

- Upcoming read/create/edit/payment responses and dashboard due totals now use the
  household calendar day, defaultUTC before household setup. Calendar due dates
  remain date-only values, not shifted instants.
- Persist intended recurrence day separately. Clamped shorter months no longer
  change a31st recurrence to the28th/30th permanently; explicit due-date edits reset
  the anchor. New manual and debt-derived items record the anchor. Migration uses
  each existing due date; historical drift before this change cannot be inferred.
- Corrected old test that enshrined Jan31 -> Mar28. API138 tests and workspace
  typechecks passed.21 migrations and5 PostgreSQL tests passed, including Phoenix
  due-today/dashboard agreement after UTC midnight and persisted Aug31 -> Sep30
  -> Oct31 payment advancement. Exact database shutdown confirmed.
- Remaining: desktop Upcoming controls, rendered action QA, reminder delivery
  semantics, Liabilities, mobile runtime and banking/beta acceptance gates.

## 2026-09-08 — desktop Upcoming management

- Goals now includes owner-only Upcoming creation/editing, paid/unpaid controls,
  recurring payment advancement and deactivation. Adding a saved debt minimum
  refreshes the list. Payment advancement clears an open edit for that item.
- New items default to reminders off; existing null/explicit preferences survive
  edits. Desktop does not schedule device notifications. Shared strict contracts
  and a narrow authenticated, same-origin BFF validate dates and cent amounts.
- Amount edits that submit an unchanged clamped due date now preserve the intended
  recurrence day. Changing the actual date resets the anchor.
- Passed core47, contracts11 and API138 unit tests; all workspace typechecks and
  diff check. `./scripts/test-postgres.ps1 -Http` passed21 migrations,5 database
  tests and real HTTP create/edit/paid/unpaid/deactivate, null reminder preservation,
  partner read/write isolation and auth/origin/strict validation. After the anchor
  fix, `./scripts/test-postgres.ps1` passed again with persisted same-date edit
  preserving31 and changed date resetting20. Both isolated servers stopped.
- Remaining: rendered Upcoming/action QA, reminder delivery/privacy semantics,
  Liabilities, native runtime and banking recovery/dedupe plus integrated beta
  acceptance and regression builds. This milestone is not beta completion.

## 2026-09-08 — mobile reminder session privacy

- Reminder defaults and stored notification handles are user-scoped. New defaults
  are off; old unscoped preferences are not inherited. Auth hydrate/login/register/
  biometric login clean legacy and other-user obligation schedules; logout
  invalidates pending work immediately and clears schedules/delivered reminders.
- Serialized native operations plus a session generation prevent permission or
  scheduling completions from recreating a previous user's reminder after logout.
  New lock-screen content is generic and contains no bill name or amount.
- Recurring payment advancement now schedules the next item rather than only
  cancelling the old reminder. Recurring items no longer remain in Recently paid
  solely because they have a lastPaidAt timestamp. Save/payment notification errors
  report saved state separately from reminder failure. Settings state device-local
  9 a.m., user-scoped defaults, and logout cancellation.
- `corepack pnpm --filter @worthlane/api exec vitest run --config
  vitest.mobile.config.ts` passed6 mocked-native tests: legacy/partner cleanup,
  independent preferences, stale caller, generic content/recurrence, permission
  and schedule races, and paid/inactive/off cancellation. Dedicated config keeps
  these tests separate from PostgreSQL integration. Workspace typechecks passed.
- iOS Expo export to `.tmp/reminder-mobile-export` passed1940 modules/6.93MB
  Hermes bundle. This is compilation and mocked adapter evidence, not native
  delivery or complete auth UI verification. No production changes.
- Remaining: restore/reconcile reminders on login and after desktop edits, mobile
  per-item editing, physical device permission/delivery/timezone QA, rendered
  desktop Upcoming, Liabilities and remaining banking/integrated beta gates.

## 2026-09-08 — foreground reminder reconciliation

- Authenticated mobile app startup/login and foreground return fetch the owner's
  current Upcoming list and reconcile local reminders. Deleted items are removed;
  changed/paid/inactive/off items replace or cancel schedules. This restores saved
  explicit preferences after logout and picks up desktop edits when mobile resumes.
- Refresh does not prompt for permission. Denied permission or refresh failure is
  visible in an app warning. Offline snapshots do not erase existing reminders;
  they may remain stale until a successful refresh. No background push sync claim.
- The fetch shares the reminder operation queue, rejects stale sessions, and times
  out after15 seconds so a stalled request cannot indefinitely hold logout cleanup.
- Dedicated mocked-native suite passes10 tests, including changed/deleted snapshots,
  offline preservation, no background permission prompt, logout during fetch and
  stalled-fetch queue release. Workspace typechecks passed before the timeout
  addition; iOS export of the final implementation passed1941 modules/6.94MB.
- Remaining: mobile per-item edit/reminder controls, rendered desktop Upcoming
  journey, physical-device foreground/delivery/permission/timezone acceptance,
  Liabilities and remaining banking/integrated beta gates.

## 2026-09-08 — mobile Upcoming editor

- Owner-scoped Upcoming screen now opens an editor for name, amount, confirmed
  date, recurrence, reminder preference and active state. It uses the existing
  PATCH contract; account reference/type are preserved. Invalid/failed saves keep
  draft input, and closing a changed draft requires an explicit discard choice.
- Saving updates local reminders and reports denied/unavailable/past reminders
  separately from saved data. Auth checks suppress stale completion feedback;
  screen/editor state and query keys are scoped to the signed-in user.
- Today/Overdue use API household-calendar status. Other future items are grouped
  as Upcoming instead of deriving a conflicting device-calendar week. Inactive
  items appear separately and remain editable.
- Mobile typecheck,11 shared contract tests,10 mocked-native reminder tests and
  diff check passed. iOS export to `.tmp/upcoming-edit-export` passed1942 modules,
  6.95MB Hermes bundle. These checks do not prove native editor layout/interactions.
- Next: rendered desktop Upcoming/debt-to-item flow and native acceptance where
  available; Liabilities, banking recovery/dedupe and full beta regression gates
  remain. Concurrent Upcoming edits still need a conflict/idempotency contract.

## 2026-09-08 — rendered desktop debt-to-Upcoming journey

- Ran `./scripts/test-postgres.ps1 -Interactive`:21 migrations,5 database tests and
  HTTP auth/origin/privacy/persistence checks passed before browser acceptance.
- Fresh synthetic registration and solo household setup through the desktop UI.
  Saved one debt:100 current balance,10 minimum,0APR,30 monthly budget, confirmed
  Sep30 due date. UI showed December2026 payoff and the exact saved due action.
- Added minimum to Upcoming; the list refreshed automatically. Repeating Add
  reported the existing item without another row. Edited it to12.34/Oct1 and marked
  paid. Reload and a separate sign-out/sign-in both showed12.34/Oct1/paid.
- Inspected Upcoming editor screenshots at390x844. No horizontal document overflow
  (375px client/scroll width excluding scrollbar). Found edge-flush body content
  and detached Active label; added scoped panel padding and inline checkbox style.
  Inspected the updated screenshot: aligned checkbox, padded controls and readable
  reminder explanation/save button. Viewport override reset afterward.
- Exact interactive stop file used; runner exited0 and confirmed PostgreSQL stopped.
  Diff check passed. Screenshots were inspected inline, not saved as artifacts.
- This proves the named desktop path only. Concurrent edits/payment retries, native
  UI/delivery, Liabilities, banking recovery/dedupe and full regression acceptance
  remain open. No production data or provider calls used in this run.

## 2026-09-08 — local cross-platform regression gates

- Fresh `corepack pnpm --filter @worthlane/api build`, desktop build and web build
  all exited0, including optimized compilation, type validation, page generation
  and traces. Used isolated build environment values: dummy loopback database URL,
  test JWT values, blank Plaid/Sentry credentials, upload/telemetry disabled. No
  database connection, deployment or provider smoke was part of these builds.
- `corepack pnpm --filter @worthlane/desktop-native test` passed14 tests. Local
  `corepack pnpm desktop:native:pack:local` with loopback desktop URL and identity
  autodiscovery disabled exited0: Worthlane.exe,7 archived assets and8 hardened
  fuses verified. This is an unpacked development-only build, not a published or
  production-signed installer and not native interactive runtime acceptance.
- Fresh core47/contracts11/API138 tests passed196 total. Recent separate mocked
  reminder suite remains10 passing; added its exact command to CI so future runs
  cover session isolation/reconciliation. Remote CI has not run for local commits.
- Non-fatal warnings: Sentry disableLogger deprecation/API-only global error handler
  suggestion; public web Browserslist data old; native author metadata absent.
- Remaining release gates are functional: concurrency/retries, Liabilities,
  interactive Plaid recovery/native support, joint/manual dedupe, native UI/device
  evidence and the complete integrated acceptance audit. Passing builds does not
  establish beta completion or live-production behavior.

## 2026-09-08 — Upcoming edit/payment conflict protection

- PATCH and markPaid/markUnpaid require expectedUpdatedAt from the displayed item.
  Shared strict contracts and both beta clients supply it. API uses owner-scoped
  atomic compare-and-update inside a transaction; version timestamps advance at
  least1ms even within one clock tick. Stale requests return409 without applying.
- Retried payment requests cannot advance a recurring date twice from the same
  displayed version. This is conflict rejection, not replay of a success receipt.
  User feedback directs refresh/reopen; mobile edit drafts remain visible and its
  cached list refreshes on conflict. No database migration required.
- API138/contracts12 tests, workspace typechecks and diff check passed.
  `./scripts/test-postgres.ps1 -Http` passed21 migrations/5DB tests plus real HTTP:
  old payment replay409, stale edit409, and simultaneous PostgreSQL payment requests
  yielding200/409 with a single Oct20->Nov20 advancement. HTTP verifies matching
  desktop payloads and stale rejections alongside owner privacy. Server stopped.
- Compatibility: older clients omitting expectedUpdatedAt now fail validation for
  edits/payment actions. Ship API and beta clients together; no production deploy
  performed. Create/delete endpoints are not covered by this version contract.
- Remaining: rendered conflict recovery/native acceptance, Liabilities, banking
  recovery/native/joint-manual dedupe and final integrated beta verification.

## 2026-09-08 — owner-only Plaid Liabilities retrieval

- Added explicit POST `/api/plaid/items/[id]/liabilities`, scoped to the authenticated
  owner's persisted connection/accounts. Sandbox calls are enabled; other environments
  require PLAID_LIABILITIES_ENABLED=true (production approval remains required).
- Narrow shared response exposes local account identity, separate current/statement
  balance, minimum vs mortgage next payment, confirmed provider date, individual
  rates and student accrued interest. Missing values stay null; no invented combined
  APR. Student note warns that servicers may repeat a combined minimum per loan.
  Raw account numbers, provider account IDs and unrelated fields are not returned.
- Source/lookup timestamp and cached/incomplete-data notice accompany the response.
  No automatic saved debt edits, reminders, or payment execution. Mapping follows
  https://plaid.com/docs/api/products/liabilities/ (reviewed September8).
- API144 tests and all workspace typechecks pass. Six new tests cover allowlisting,
  missing/invalid values, multiple rates, mortgage/student distinctions, ownership,
  and non-Sandbox activation gating.
- `./scripts/test-postgres.ps1 -Sandbox` final run passed21 migrations/5DB tests and
  live provider integration: encrypted Item exchange with Transactions+Liabilities,
  debt fields, nonowner404, transaction replay, login-required/update-token, unlink.
  Initial live failures exposed local/provider item-ID mismatch in account lookup;
  corrected query and fixture, then verified against real persisted Sandbox data.
  All temporary provider Items were cleaned up and each isolated DB was stopped.
- Remaining Liabilities work: Link consent/availability UX, desktop/mobile review
  and confirmed copy into plans with provenance, refresh behavior and acceptance.
  This is backend/Sandbox proof, not completion of the user-facing debt-data flow.

## 2026-09-08 — desktop/mobile bank-debt review panels

- Desktop Goals and mobile debt planning now offer explicit per-connection Check
  actions for Liabilities. Results show source/retrieval time, cached-data notice,
  separate monetary fields, missing-value labels, individual rates and student
  payment-grouping notes. No provider request runs automatically on screen load.
- Empty connections/results and unavailable responses retain manual entry. New
  requests clear earlier results; removed connections no longer display snapshots.
  Mobile data is user-scoped and stale-auth responses do not publish a snapshot.
- Desktop POST proxy now allowlists the empty-body items/id/liabilities action.
  `./scripts/test-postgres.ps1 -Http` passed21 migrations/5DB tests and real HTTP
  checks, including Liabilities401/403/strict-payload400/missing-owner-item404.
  Existing consent/budget/debt/Upcoming HTTP checks also passed; server stopped.
- Desktop/mobile typechecks and diff check passed. iOS export1944 modules/6.96MB
  passed; Metro noted transient missing .next directories while HTTP servers were
  compiling, but completed successfully. No native UI or populated browser review
  proof is claimed by this bundle check.
- Remaining: Liabilities consent upgrades, explicit confirmed copy with saved
  provenance, rendered review/error/empty-state checks, and broader banking/native
  integrated beta acceptance. These panels currently support review/manual entry.

## 2026-09-08 — explicit desktop debt-data consent request

- Added a separate Review debt-data consent action for existing connections in
  desktop bank-debt review. Link requests additional Liabilities consent only when
  explicitly selected; ordinary bank creation stays Transactions-only. Retrieval
  remains a separate Check action and never changes saved plans automatically.
- Update-mode token requests now omit transaction initialization settings. The
  desktop proxy validates the optional boolean; non-Sandbox Liabilities requests
  remain disabled unless explicitly configured. No production activation occurred.
- API148 tests passed, including product-consent request shape, missing update
  access token and non-Sandbox gating. `./scripts/test-postgres.ps1 -Sandbox`
  passed21 migrations/5DB tests and live Sandbox integration including the new
  consent-update token. Provider Items were removed and the database stopped.
- `./scripts/test-postgres.ps1 -Http` passed21 migrations/5DB tests and the full
  real HTTP suite, including the added consent payload type/auth checks. Database
  and HTTP servers stopped successfully.
- All workspace typechecks and `git diff --check` passed after server shutdown.
- This proves token creation, not interactive consent completion: the Sandbox
  fixture already has Liabilities. Native consent, rendered Link/recovery/OAuth,
  confirmed copy into plans with provenance, joint/manual deduplication and final
  integrated/device acceptance remain unfinished. No deployment or spending.

## 2026-09-08 — reviewed bank-debt copy and saved reference

- Desktop bank-debt details now offer an explicit review form that appends to the
  current plan draft. User confirms figures and checks for an existing debt; APR
  must be entered explicitly, missing amounts stay blank, currency mismatch stops
  copying, and student grouped-payment/accrued-interest warnings remain visible.
  Copy does not save, replace existing debts, refresh figures or schedule reminders.
- Added optional strict bankReference to debt entries and nullable JSONB migration
  20260908210000_debt_bank_reference. It records client-declared Liabilities review
  and retrieval timestamps, not provider verification. No tokens/account numbers
  are accepted in this reference. Existing manual entries need no reference.
- Both clients preserve/display the reference on editing saved plans, with an
  explicit warning that values may have been edited and do not refresh. Mobile
  copy UI is still pending. Existing older clients may omit this optional metadata
  on a subsequent edit; ship current clients together to retain it.
- Shared core47/API148 tests passed; contracts14 tests pass including legacy input
  and strict provenance rejection. Prisma generation and all workspace typechecks
  passed. `./scripts/test-postgres.ps1 -Http` passed22 migrations/5DB tests and the
  complete HTTP suite. Extended DB journey saves/reopens a reference on a private
  plan alongside existing stranger denial and revision checks. Servers stopped.
- iOS export1944 modules/6.96MB and diff check passed. Populated copy form, draft
  preservation across interactive actions, and native UI still need rendered QA.
  Broader Link/consent/recovery, joint/manual deduplication and integrated acceptance
  remain incomplete. All changes local; no production migration or deployment.

## 2026-09-08 — mobile reviewed bank-debt copy

- Mobile debt review now offers editable figures and a confirmation switch, then
  appends to the current draft without replacing debts or saving automatically.
  Editing a figure clears confirmation. Copy is disabled during plan requests,
  at100 debts, and after a successful copy from the displayed snapshot. The parent
  checks the current user before accepting the draft entry.
- Shared reviewedBankDebt validation now serves desktop and mobile. It requires
  explicit balance/minimum/APR and confirmation, rejects missing/mismatched currency,
  and preserves separate statement/current amounts and optional missing dates.
  It does not infer a combined APR or convert mortgage next-payment into minimum.
- Contracts17 tests and all workspace typechecks passed. New tests cover exact
  cents, provenance, missing required figures, unconfirmed/currency mismatch,
  invalid dates/precision, optional fields and an explicit zero APR. No API or
  database persistence changes in this milestone.
- iOS export1946 modules/6.96MB and diff check passed. This is bundle evidence,
  not device interaction or notification-delivery evidence.
- Rendered copy/draft checks on desktop and actual native UI remain pending,
  alongside Link/consent/recovery, joint/manual deduplication and full acceptance.

## 2026-09-08 — populated browser debt-copy and Link update acceptance

- Added opt-in `./scripts/test-postgres.ps1 -SandboxInteractive`: isolated loopback
  PostgreSQL, normal HTTP assertions, ephemeral encryption key, real Sandbox fixture
  exchange,15-minute browser window and provider Item cleanup on normal exit/failure.
  Ordinary HTTP mode still blanks provider credentials. Synthetic login is printed
  only for this opt-in mode; provider credentials/tokens are not printed by helpers.
- First startup failed because the helper supplied an empty optional redirect URL;
  removed that override. The failed run stopped and cleanup completed. Corrected
  run passed22 migrations/5DB tests plus the entire real HTTP suite and fixture
  exchange. Explicit stop file ended it with exit0, provider cleanup and DB stop.
- Actual in-app browser: signed in as synthetic Alex, opened Goals, entered manual
  debt100/min10 plus payment budget150, and checked linked Liabilities. Rendered
  card current410/statement1708.77/min20 and individual APRs; mortgage missing minimum
  and student grouped-payment warning were visible. Corrected synthetic card date
  from2020-05-28 to2026-09-30 and explicitly entered12.5APR before confirming copy.
- Copy appended exactly one debt and disabled that copy button; original manual
  draft/payment budget remained. Saved Reviewed bank acceptance; reloaded and opened
  it through UI. Both debts, distinct amounts, corrected date and review timestamps
  persisted. Estimate showed Dec2026 payoff,8.56interest and518.56payments.
- Actual Plaid Link opened via Review debt-data consent, skipped phone enrollment,
  displayed synthetic accounts and credit/loans scope, completed update successfully,
  and returned the app's completion message after Finish without saving a Plaid profile.
  The fixture already had Liabilities: this is real existing-Item Link-update proof,
  not proof of upgrading a Transactions-only Item or new/OAuth/native connection.
- Visual screenshot inspection found cramped provenance placement; moved reference
  to a full-width row and padded the planner. Second screenshot confirmed readable
  fields and retained values. Desktop typecheck, helper syntax and diff checks pass.
- Still required: transaction-only consent upgrade, new/recovery/OAuth/native banking,
  native review/delivery checks, joint/manual deduplication and integrated acceptance.
  No production activation, migration, spending or deployment.

## 2026-09-08 — correct mobile Link update completion

- Inspection found mobile incorrectly exchanged public tokens after both create
  and update callbacks. Update now syncs the selected existing Item; only creation
  exchanges a required public token. Missing Item/token fails before a request.
- Captures the linking user before token creation, checks again before opening
  Link and before callback mutations, and suppresses alerts/query publication if
  the user changes during completion. These guards do not prove native SDK behavior.
- Added4 injected-request tests to the existing mobile test gate: update without
  public token, create exchange, missing inputs/stale user rejection, and changed
  user after request. Combined mobile suite14 tests and mobile typecheck pass.
- Corrected a pre-existing Windows-1252 apostrophe embedded in the UTF-8 Profile
  source; surrounding content preserved. iOS export1947 modules/6.97MB and diff
  check passed. No banking activation or production changes.
- Current installed SDK10.13.2 remains autolinking-excluded. Official current docs
  https://plaid.com/docs/link/react-native/ describe SDK13 session APIs and native
  requirements; supported SDK migration/autolinking/native build and actual device
  banking remain the next implementation work. Do not infer completion from export.

## 2026-09-08 — Plaid13 native migration and Android prebuild

- Pinned react-native-plaid-link-sdk13.1.0, replaced removed openLink with
  createPlaidLinkSession/session.open, retained create/update and user guards, and
  removed Expo's Plaid autolinking exclusion. Event callback intentionally does not
  log banking metadata. Feature activation/production settings remain unchanged.
- Added Expo54-compatible expo-build-properties1.0.10 with Android minSdk26.
  Existing checked-in Android project was an older template; preserved it under
  ignored .tmp/android-before-plaid13 and regenerated with Expo54 --no-install.
  Current Gradle8.14.3/Expo module settings, secure-store backup exclusions and
  generated image formats replace stale template output. Preserved application ID,
  debug keystore and existing worthlane/com.worthlane.mobile link schemes.
- Autolinking resolve --json found Plaid13.1.0 Android module and Apple pod/Swift
  module. Frozen offline install, all workspace typechecks, mobile14 mocked tests
  and iOS export1946 modules/6.97MB passed. Removed unrelated Next/Babel lock drift.
- Android `gradlew.bat :app:assembleDebug --no-daemon` reached Expo configuration:
  buildTools36, minSdk26, compile/target36, NDK27.1, Kotlin2.1.20. Failed at missing
  Android SDK location (no ANDROID_HOME/ANDROID_SDK_ROOT/local.properties), after28
  Gradle tasks. An accompanying generic autolinking warning is not native proof;
  standalone module discovery passed, but full build still needs verification.
- No APK/iOS native build/device success is claimed. Next: supply local Android
  toolchain and compile; native Sandbox/UI/reminder checks and remaining banking,
  deduplication and integrated beta acceptance. No paid cloud build or production.

## 2026-09-08 — authorized local Android SDK installation

- Tyler explicitly approved accepting the Android SDK agreement and installing
  Google's free tools locally. `./scripts/setup-android-sdk.ps1 -AcceptLicense`
  completed with exit 0. The pinned official command-line tools archive is SHA256
  checked before extraction. SDK 36, build-tools 36.0.0, platform-tools, NDK
  27.1.12297006 and CMake 3.22.1 are installed under ignored `.tmp/android-sdk`.
- Added reproducible PowerShell setup/build helpers; no machine-wide environment
  changes. The debug build scopes SDK variables, disables Sentry upload and restores
  the original environment afterward. Custom SDK paths resolve before directory changes.
- `./scripts/build-android-local.ps1` is still running in session 9409. It passed
  the previous missing-SDK failure and discovers the Plaid native module. A live
  Gradle thread inspection shows an HTTP dependency metadata request waiting for
  a response; no terminal result or APK success is claimed. Continue observing
  this same process before retrying. No production activation or spending.

## 2026-09-08 — allow zero/100 custom responsibility shares

- Acceptance cross-check found the shared allocation engine already supported
  zero shares, but the request contract and desktop input rejected them. Both now
  accept 0%; the form requires an explicit entry and shares still total 100%.
- Contract regression covers both zero/100 orders, negative values and all-zero
  rejection. Extended the PostgreSQL two-user journey to edit rent to 0/100 at
  170,001 cents, reconnect Prisma, log the partner in again and verify exact saved
  shares/remaining amounts without duplicating cents.
- `corepack pnpm --filter @worthlane/contracts test`: 18 passed;
  `corepack pnpm --filter @worthlane/desktop typecheck`: passed;
  `./scripts/test-postgres.ps1`: 22 migrations and all 5 integration tests passed,
  isolated cluster stopped. The first integration attempt used the wrong test
  import (PATCH instead of the existing PUT handler); corrected and reran fully.
- Historical split changes still need durable history/effect handling; this fix
  does not claim that acceptance item. Native/interactive acceptance remains open.

## 2026-09-08 — first successful Plaid-enabled Android native compilation

- Original session 9409 ended with exit 1 after 6m56s/402 tasks: CMake reported
  pnpm-nested object paths above its limit, then Ninja failed with `build.ninja
  still dirty after 100 tries`. Plaid Kotlin compilation itself passed.
- Added opt-in `scripts/android-local.init.gradle`, used by the local build helper,
  to set Android's CMake buildStagingDirectory to ignored `.tmp/android-cxx` per
  module. No dependency source edits or generated-project patching. The DSL is
  documented at https://developer.android.com/reference/tools/gradle-api/8.3/null/com/android/build/api/dsl/Cmake.
  Ignored Kotlin's generated local compiler session directory. Gradle also installed
  build-tools35 under the already-authorized SDK license during the first build.
- `./scripts/build-android-local.ps1 *> .tmp/android-build-short-path.log` exited0:
  BUILD SUCCESSFUL in1m40s;447 tasks (50executed/397cached). Failed native CMake tasks
  rebuilt successfully for all four architectures. API typecheck also passed.
- APK: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`,151856888 bytes.
  aapt confirms com.worthlane.mobile, min26,target36 and arm64-v8a/armeabi-v7a/x86/x86_64.
  apksigner verify passes. SHA256:
  `8A68EC6EC7900531BFD0898A8C0193075AD6B1E64EDC6B1ADC696FB30EE62E64`.
- This is a local development-client APK with native Plaid linked, not a production
  release or actual Link/reminder/device proof. No Sentry upload, paid build or
  production banking activation. Browser computer use is available; native app
  control is disabled in this session. Native Sandbox/device acceptance, historical
  split effects, deduplication and complete integrated journeys remain required.

## 2026-09-08 — native control and Android UI verification

- Correction to the preceding entry: native Windows control is available through
  the Computer Use skill's `@oai/sky` runtime. The browser CUA tool's native-disabled
  restriction does not describe this separate runtime. Calculator was controlled
  through native clicks and displayed 2 + 2 = 4. No capability setting change was
  required. Tyler explicitly resumed Computer Use after an Escape interruption.
- Installed the authorized Android 36 Google APIs emulator image and booted
  WorthlaneBeta using available WHPX acceleration. Enabled the test AVD's hardware
  keyboard so native text input reaches Android. Installed the already verified
  development APK; Metro served the app with banking, paywall and telemetry disabled
  against the isolated local API. The prepared Metro script runs successfully after
  replacing incompatible `--localhost --offline` flags with EXPO_OFFLINE=1.
  Its initial automatic approval rejection was resolved by Tyler's authorization.
- Native UI actions registered synthetic Alex, reached onboarding, opened the first
  account path, and saved Alex test checking with $2,000.00. The saved account
  appeared in Settings and the dashboard. This is real Android UI evidence, separate
  from the earlier APK compilation result.
- Created synthetic Sam and an accepted two-person household through the local API
  fixture (not through native invitation screens). API-created Food & Drink
  responsibility at 170,001 cents displayed correctly in Android: Alex $0 assigned,
  Sam $1,700.01. Reversed the split through the API; reopening Household displayed
  Alex $1,700.01 and Sam $0. Fresh API logins for both test accounts confirmed the
  saved allocations. Native account switching and partner-side UI remain untested.
- Opened Budget agreement history in Android and observed the prior definition:
  Alex 0% / $0 and Sam 100% / $1,700.01, with timestamps and the change-effects
  explanation. History is a previous plan definition, not a settled balance or
  historical spending report. The current screen refreshes external changes when
  reopened; no real-time cross-device update is claimed.
- Findings still open: first-account onboarding detours through Net worth and
  Settings; onboarding lacks an explicit solo/couple choice; mobile household
  responsibilities have no create/edit controls, so native split editing cannot
  pass yet. Dashboard rounds the $1,700.01 responsibility to $1,700, while household
  detail preserves cents. Current responsibility cards omit explicit percentages.
  Legacy manual-only/Plaid-coming-soon copy also remains. Full onboarding acceptance,
  mobile editing, native Plaid and reminders are not passed by this test.

## 2026-09-08 — durable responsibility definition history

- Added atomic snapshots before responsibility replacement/removal, scoped read API
  with bounded cursor pagination, and desktop/mobile history views. Snapshots retain
  allowlisted prior agreement fields only. Pre-recording versions cannot be recovered
  and are not fabricated. Edit copy explains that current-month allocations are
  recalculated, including earlier spending; payer and transaction amounts stay intact.
- Validation: workspace typechecks, contracts 18, API 148, and PostgreSQL 5 integration
  tests across 23 migrations passed. Integration coverage includes replacement/removal,
  unauthorized access, household isolation, foreign cursors and pagination. Local HTTP
  suites also passed. Android history rendering was observed above; desktop history
  rendering and a complete final regression build remain unverified.
- Extended the isolated HTTP harness with a bounded 1–120 minute interactive window
  (default 15) and added `scripts/start-mobile-local.ps1` for the scoped emulator API
  environment. No production or paid services were enabled.

## 2026-09-08 — native category budget creation and editing

- Added an owner-only mobile budget editor using the existing responsibility API
  and shared request contract. Supports one-person, equal and custom percentages,
  explicit 0% shares, category selection, edit and confirmed removal. Opening a
  form loads categories for the signed-in user; saving invalidates household/history
  queries. The API continues enforcing ownership. Added the typed PUT convenience
  method to the existing authenticated mobile request client.
- Native emulator actions edited the existing 170,001-cent budget from 100/0 to
  0/100 and saved it. An attempted 0/0 total was rejected without saving. Replaced
  technical validation wording with a clear 100% total message and retested it.
  The updated household card displayed Alex 0%/$0 and Sam 100%/$1,700.01.
- Created Native utilities entirely through the Android form, selected Utilities,
  entered $150.01 and saved an equal assignment. The household screen displayed
  Alex 50%/$75.01 and Sam 50%/$75.00, conserving the odd cent. Fresh API logins for
  both synthetic users confirmed one saved new budget and the native-edited split;
  Sam's detailed accounts remained empty while Alex's account stayed private.
- Responsibility cards now show explicit percentages. Dashboard household money
  formatting preserves cents instead of rounding $1,700.01 to $1,700. Mobile
  typecheck passed after final validation changes; React skill review checked hook
  order, scoped queries, accessibility labels, form state and parallel invalidation.
- Remaining verification: one-person/removal native actions, partner-side native
  login, dashboard visual confirmation, guided solo/couple onboarding, desktop
  history UI and full regression builds. This is Android development-client UI
  evidence with current Metro JavaScript; it does not imply a rebuilt release APK,
  iOS native acceptance, Sandbox Link success or complete beta acceptance.

## 2026-09-08 — guided mobile setup with solo and household choices

- Replaced the legacy welcome page with explicit solo, partner/family and invitation
  joining paths. Solo creates a one-member plan without an invitation; household
  creation explains separate consenting logins and private-by-default accounts.
  Joining uses the existing invitation-code acceptance endpoint. Currency (USD)
  and device time-zone behavior are disclosed before saving. Existing saved plans
  resume at account, category-budget, bill and debt-plan steps.
- Settings now offers Continue guided setup. The manual-account step opens the
  existing form directly via a consumed route parameter; the dashboard first-account
  action uses the same route. Updated registration tone and removed stale bank-coming-
  soon copy from the dashboard. No bank feature flag or production setting changed.
- Actual Android actions resumed Alex's saved setup, opened the manual form directly
  and cancelled without creating an account. Signed Alex out, registered a fresh
  synthetic solo login, chose Just me, entered Casey, and saved My plan without an
  invitation. Android displayed the saved-plan guide. A fresh API login confirmed
  one owner/member, persisted plan/name and no account leakage from Alex.
- Dashboard visual verification also confirmed the prior cent-format fix displays
  $1,700.01. Mobile typecheck and existing mocked native suite (10 reminder + 4 Plaid
  tests) passed. Those mocks do not prove the new onboarding screens; native actions
  above are the UI evidence. React review covered hook order, user-scoped queries,
  inline error handling and disabled submission during requests.
- Still required: invitation joining and partner/family setup through the new native
  guide, a complete solo account-to-budget/bill/debt journey, partner-side native
  privacy and editing checks, and full regression builds. Setup progress derives
  from saved server data; an unfinished name/code draft is not persisted.

## 2026-09-08 — native invitation joining and partner privacy

- In Android, Casey created an invitation for a synthetic email that had not yet
  registered. Signed Casey out, registered the invited login, and observed the
  unjoined onboarding choices rather than automatic household access.
- First manually transcribed code returned Partner invitation not found. Its exact
  failure cause was not established. Issued a replacement code through the local
  API fixture, entered that exact code in Android's new onboarding join form, and
  accepted successfully. This proves native acceptance with an API-issued replacement;
  uninterrupted native code creation/copy/acceptance is not yet a passed journey.
- The joined partner's Android Household screen showed My plan, shared with Casey,
  no account details, visible net worth $0, and Casey utilities assigned 100%/$150.
  Owner editing/invitation controls were absent. Private savings ($1,234.56) and the
  owned budget were added through the local API as test fixtures before joining.
  Fresh API logins for both users confirmed two members in the same persisted plan;
  Casey alone saw the private savings balance and account details.
- Separated the generated invitation code into selectable monospaced text with
  press-and-hold copying guidance. Added a visible input label and actionable
  unavailable-code guidance without revealing another login's invitation. Mobile
  typecheck passed. These final copy/layout changes still need an owner-side visual
  recheck; the join and partner privacy observations above precede those text edits.
- No real invitation/email was sent. All accounts and amounts are synthetic, on
  the isolated local API. Full solo/two-user spending, banking, bills/debt/reminders,
  persistence and regression acceptance remain required; this is a bounded native
  invitation/privacy check, not beta completion.

## 2026-09-09 — mobile owner-controlled account visibility

- Added account-owner controls for Private, Summary only and Shared detail, with
  disclosure before an explicit Save visibility action. Merely selecting an option
  does not change server access. Household members can manage their own accounts;
  controls are not granted based on household-owner role. The existing authenticated
  visibility endpoint continues enforcing account ownership. Choices have 44px
  minimum touch targets and disabled save state is visually distinct.
- Recovered after an intentional interruption: previous process handle was absent,
  ports were not listening and pg_ctl confirmed the retained test cluster was stopped.
  Resumed that same isolated database, not replacement data; HTTP/BFF suites passed.
  The interrupted SUMMARY save had persisted. Fresh logins confirmed owner visibility,
  partner summary-only totals and hidden account details. Restarted Metro/emulator;
  the retained mobile session loaded and displayed Summary to partner.
- Native Android actions then saved SHARED and PERSONAL. Fresh owner/partner API
  logins after each save verified exact totals: Casey's 123,456 cents became 469,134
  while Jordan's 345,678 cents were summary/shared, then returned to 123,456 when
  sharing was revoked. Summary mode excluded Jordan account detail; shared mode
  included it; private mode excluded both detail and summary. Casey's 15,000-cent
  responsibility remained unchanged throughout. Android showed Visibility saved.
- The account was a synthetic API fixture owned by Jordan (household MEMBER).
  Changes were made through Android UI; partner results were verified through fresh
  API logins, not a simultaneously open partner UI. Transaction-history display and
  already-open cross-device revocation behavior remain separate acceptance checks.
  Mobile typecheck passed. No production settings, banking or real accounts changed.
- Remaining visual finding: the personal dashboard available-balance formatter still
  rounds cents, while household money now preserves them. Full integrated solo and
  two-user financial journeys, native banking/reminders and regression builds remain.

## 2026-09-09 — resumed native control, exact Today balance and bill creation

- After renewed user authorization, the Computer Use skill's native sky API returned
  the running Android emulator and captured Worthlane successfully. Native control
  is available; the browser-only CUA restriction does not describe this separate API.
- Fixed Today money formatting to retain cents. Android Fast Refresh displayed the
  synthetic Jordan balance as $3,456.78 instead of $3,457. Mobile typecheck passed.
- Created Jordan native test bill for $87.65, due 2026-09-09, through Android Quick
  add. Observed Saved, the Upcoming row, and reopened Edit with the exact amount,
  date, one-time recurrence and reminder Off. Fresh local API logins independently
  confirmed one persisted unpaid bill and its absence from Casey's Upcoming list.
- This run did not rebuild the APK or test reminder delivery, bill payment-status
  changes, or a partner UI session. Earlier APK build and onboarding/split evidence
  remain separate. Full beta acceptance remains open.

## 2026-09-09 — categorized Quick add and calendar-date correction

- Quick add now shows the manual account receiving an expense/income, requires a
  choice when multiple accounts exist, and offers category selection. Previously it
  silently chose the first manual account and omitted category. Queries and draft
  lifetime are scoped to the current login; transaction saves refresh household,
  budget and goal queries. Activity manual create/edit/delete also refreshes the
  household summary. Entry fields stay disabled while saving, and amounts reject
  more than two decimals before submission. No manual/import deduplication claim.
- Native Android: added a second private zero-balance wallet via a local API fixture;
  verified the no-account-selected validation, selected that wallet and Utilities,
  then saved a $23.47 synthetic expense. Today immediately displayed $23.47 spent.
  Fresh API logins verified exactly one entry on the selected account/category.
  Jordan's permitted view applied 2,347 cents to Casey's existing 15,000-cent
  responsibility, leaving 12,653 cents; the assignment remained entirely Casey's.
  Casey's own view excluded Jordan's private purchase from ledger and budget spend.
  This partner check used the API, not a concurrent partner Android session.
- Native observation found Today labeling a bill due today as Tomorrow: the old
  function rounded noon minus midnight to one day. Replaced it with calendar-day
  comparison, including singular overdue wording. Android now displays Today.
- Validation: `corepack pnpm --filter @worthlane/mobile typecheck` passed;
  `corepack pnpm --filter @worthlane/api exec vitest run --config vitest.mobile.config.ts`
  passed 17 checks (10 reminder mocks, 4 Plaid mocks, 3 calendar tests). The calendar
  tests also passed with process-local TZ=America/New_York, covering local-day,
  year, leap-day and daylight-saving boundaries. React review checked scoped state,
  derived selection, independent queries and accessible choice states.
- Remaining: native edit/refund/overspend flows, complete persistent solo/two-user
  journeys, joint-account/manual import deduplication, native Sandbox banking and
  actual reminder delivery, plus regression builds. No APK rebuild or production
  changes in this milestone; existing build evidence remains separate.

## 2026-09-09 — native debt-plan creation, comparison and reopening

- Using Jordan's existing local test login, navigated Today -> Goals -> Debt payoff
  plans. Entered and previewed a $1,000 debt at 0% APR, $50 minimum and $100 monthly
  budget, starting September 2026. Android showed June 2027 payoff, $0 interest and
  $1,000 total payments. Saved through the native UI.
- Added a second debt natively: $2,000 balance, $25 minimum, 12% APR. Avalanche
  preview/save showed July 2029 payoff, $445.36 interest, $3,445.36 total payments,
  and $50/$50 first-month payments. Switched to snowball, previewed and saved:
  July 2029 payoff, $487.13 interest, $3,487.13 total payments and $75/$25 initial
  payments. The UI distinguishes preview-only from saved state and discloses the
  fixed-budget, month-end, no-new-purchases assumptions.
- Fresh API logins verified one persistent plan with exact entered balances/APRs,
  $100 monthly budget, avalanche revision 2 then snowball revision 3, and estimates
  matching the native observations. Casey's separate login received 404 when
  requesting Jordan's plan by ID. Partner privacy proof here is API-based.
- Left the planner for Goals, reentered into the blank new-plan form and used Open
  My payoff plan. Android restored the saved $100 budget, snowball selection and
  debt data. This verifies navigation/remount reopening; native logout/login and
  app-restart reopening remain distinct checks. No source code changes or rebuild
  were needed for this milestone. All data is synthetic in the retained local DB.
- Remaining debt UI acceptance includes insufficient-payment/promo warnings,
  confirmed due-date conversion to Upcoming, and native reminder behavior. The
  complete solo/two-user banking and financial journeys remain open.

## 2026-09-09 — native debt shortfall and confirmed Upcoming conversion

- Fixed the mobile debt-to-Upcoming action to refresh the current login's Upcoming
  and Today queries after success. Previously the saved obligation could leave
  those cached views stale. Typecheck passed. Fast Refresh reset the development
  form after adding a hook; reopened the saved plan before testing the new action.
- Native preview: changed the two-debt monthly budget from $100 to $40. Android
  displayed This plan needs adjustment, a $35 minimum shortfall, and the warning
  that the budget does not cover entered minimums. Reopening the saved plan restored
  $100, confirming preview-only changes had not overwritten the saved input.
- Entered and saved September 10, 2026 as the first debt's confirmed due date.
  Added its $50 minimum to Upcoming through Android. The UI disclosed reminders
  off and no payment execution. A second native add reported that the item already
  exists. Upcoming displayed one $50 item due September 10; Today showed two items
  totaling $137.65, with correct Today/Tomorrow labels, without manual refresh.
- Fresh local owner/partner API logins verified exactly one converted obligation,
  $50 amount, the confirmed date, unpaid state and reminders NONE. Casey could not
  see it. Saved debt revision 4 retained the $100 snowball budget and $487.13
  estimated interest; changing the reference due date did not alter the estimate.
- No notification delivery, real payment, production change or APK rebuild occurred.
  Native promo handling, logout/app-restart persistence, banking/deduplication and
  integrated solo/two-user regression acceptance remain open.

## 2026-09-09 — confirmed bank identity and atomic account snapshots

- Plaid account IDs can differ across repeat links. Added an internal SHA-256
  bankIdentity from provider persistent_account_id when supplied, with a unique
  (userId, bankIdentity) constraint. Same-login repeat connections with a confirmed
  identity are rejected before importing another copy. Existing connection sync
  still updates balances. Existing rows acquire identity during later sync; the
  migration does not infer identities from names, masks or balances.
- Account snapshots now validate ownership and save all accounts in one serializable
  transaction. A duplicate late in the snapshot rolls back earlier additions;
  concurrent duplicates cannot both commit. Conflicts produce a retry/existing-
  connection message. Separate logins are not merged or granted account access.
  The identity hash is not included in client response mappings.
- Coverage limitation: Plaid supplies persistent_account_id only for applicable
  institutions. See [Plaid account identity](https://plaid.com/docs/api/accounts/)
  and [duplicate Items](https://plaid.com/docs/link/duplicate-items/). Unknown identity
  remains unknown; matching names/masks does not suppress legitimate accounts.
  This milestone does not deduplicate shared joint-account totals or manual imports.
- Validation: Prisma generation and workspace typechecks passed; API 148 tests
  passed. `./scripts/test-postgres.ps1 -Port 55440` applied 24 migrations and passed
  all 6 integration tests, including confirmed duplicate rollback, preserved original
  link, unknown-identity accounts, separate-login ownership and concurrent duplicate
  attempts. First run reached registration throttling before the new assertions;
  corrected the account-storage test to use isolated DB user fixtures, then passed.
- Stopped the known local HTTP session for Prisma regeneration, migrated the same
  retained synthetic database and resumed services. All HTTP/BFF suites passed.
  No production migration, external bank call or native Link proof in this change.
  Existing Sandbox and Android build/UI evidence remains separate. Next: privacy-
  aware joint-account reconciliation, manual-import matching and native Sandbox.

## 2026-09-09 — privacy-filtered confirmed joint-account totals

- Household aggregation now filters the viewer's account permissions before matching
  confirmed bank identities. Repeated permitted copies count once for net worth and
  category spending. The viewer's own connection supplies their ledger; no partner
  feed is silently substituted as more complete. Unknown identities remain separate.
  Both permitted detailed copies stay available for review, with an explanation on
  the excluded copy. Private copies cannot affect selection or duplicate notices.
- Added bank notices to the mobile Household screen, alongside existing Today and
  desktop notice surfaces. Fractional money displays retain two decimal digits;
  whole amounts can still omit cents. No account access or responsibility changes.
- PostgreSQL checks cover private, SHARED, SUMMARY and revoked access, duplicate
  balances, duplicate expenses/refunds, unchanged equal allocations, hidden-balance
  changes, and unknown-identity fallback. All 7 database tests passed after 24
  migrations; 49 core and 148 API tests and workspace typechecks passed. Mobile
  typecheck passed again after the final display adjustment.
- Local synthetic API/DB fixture: Jordan and Casey each have a $420.12 shared copy
  and $10 Utilities purchase with the same confirmed test identity. Native Android
  Household shows Jordan's $3,876.90 visible net worth and the repeat-connection
  explanation, not $4,297.02. Fresh API logins verify Jordan's permitted spend of
  $33.47 and Casey's $10, preserving Jordan's private $23.47 expense exclusion.
  Casey's visible net worth is $1,654.68. Identity hashes are absent from responses.
  This is synthetic provider-identity evidence, not a live Plaid joint-link test.
- Remaining: explicit reconciliation when provider identity is unavailable and
  manual/import duplicate matching, native Sandbox/reminders, partner UI/restart
  persistence, and complete integrated regression acceptance. No production changes.

## 2026-09-09 — explicit manual/import duplicate review

- Added an authenticated review API and mobile Activity entry point. It compares
  only the owner's manual and imported entries, using equal signed amounts within
  three days as suggestions. Pages cover 20 manual entries and show up to five
  bank candidates each; ambiguous matches require the user's decision.
- Confirmation checks both saved timestamps and ownership in a serializable
  transaction. It excludes the manual copy from totals without deleting either
  record. Activity's Budget treatment can restore the entry. The confirmation
  explains that bank sharing rules apply and household totals may change; if the
  imported record disappears later, restoration remains a manual review action.
- Final React review added session guards before submitting and displaying errors,
  plus cancellation semantics and wording that covers credits as well as purchases.
- Validation: workspace typechecks and 148 API tests passed in the implementation
  run; the final mobile typecheck passed after the session guard. The isolated
  PostgreSQL run applied 24 migrations and passed 8 tests, covering owner isolation,
  stale-match rejection, retained records, one counted amount, restoration and
  history pagination. Logs: `.tmp/duplicate-review-{typecheck,api-tests,postgres}.log`.
- Earlier native Android interaction reached the confirmation and success dialog
  for the known synthetic $23.47 pair. Fresh local owner/partner logins in this turn
  verified manual EXCLUDED, bank AUTO, both records retained, $33.47 monthly spend,
  no remaining suggestions, and no partner access to either private record.
  Command: `node .tmp/check-native-import-review.mjs`. Its first run referenced an
  incorrect top-level dashboard field; corrected to `today.spentThisMonth`, passed.
- No new native interaction or APK build in this turn. Current Computer Use exposes
  the restriction "Native computer APIs are disabled" and Calculator selection
  returns `cua.getApp is not a function`; the separate Windows node runtime is absent.
  Earlier native evidence does not verify the final session-guard/copy adjustment.
- Still required: desktop duplicate review, unknown-identity account reconciliation,
  native Sandbox lifecycle and reminder delivery, restart/partner UI persistence,
  and integrated solo/two-user regression acceptance. No production changes.

## 2026-09-09 — desktop duplicate review and persisted browser verification

- Added a Reports duplicate-review panel using the existing shared contract/API.
  It shows both descriptions, signed amounts, dates and accounts before explicit
  confirmation. Keep both cancels; exclusion refreshes workspace totals and leaves
  both records visible. Refresh and history paging support continued review.
- The narrow desktop BFF uses secure session cookies, same-origin JSON mutation
  checks and the strict shared confirmation schema. Added regression assertions
  to `scripts/test-http.mjs` for anonymous GET/POST, cross-origin rejection, forged
  fields, missing records and empty owner review. The full HTTP script was not
  restarted this turn; equivalent focused checks ran against the live local pair
  with `node .tmp/check-duplicate-bff.mjs`, including oversized-cursor rejection.
- Interactive in-app browser: Jordan signed in, opened Reports, restored the known
  manual $23.47 entry through Budget treatment and saw expense mix rise to $56.94.
  Opened the matching bank suggestion, chose Keep both, reopened and confirmed.
  Success showed both records retained, manual excluded, no remaining suggestions
  and expense mix $33.47. A full browser reload retained both rows and the exclusion.
  `node .tmp/check-native-import-review.mjs` freshly verified owner totals and that
  Casey could not read either private entry. These are browser and local API results,
  not new Android or Plaid Link evidence.
- Final desktop typecheck and diff whitespace check passed. No build/release claim.
  Existing Reports headline rounds $33.47 to $33 while expense mix and rows show
  exact cents; broader display consistency remains a polish item.
- Remaining: unknown-identity account reconciliation, native Sandbox and reminder
  delivery, partner/restart integrated journeys and regression builds. Native tool
  restriction remains; browser control works. No spending or production changes.

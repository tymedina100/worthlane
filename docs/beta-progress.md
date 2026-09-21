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

## 2026-09-10 — macOS persisted regression and exact desktop totals

- Continued from merged main `10cd6fa` in `/Users/tylermedina/worthlane-beta-work`
  on `codex/beta-acceptance`. The Desktop checkout had cloud-offloaded Git files;
  this separate local checkout preserves it and avoids blocking file hydration.
- Desktop `hideCents` now omits only zero cents. Reports, household allocations,
  goals and budget headline amounts retain fractional cents (e.g. $33.47), while
  whole-dollar amounts remain compact. Explicit compact chart notation is unchanged.
- Added `bash scripts/test-postgres.sh --http` for macOS/Linux with an isolated,
  loopback-only synthetic cluster, explicit test database, migrations and cleanup.
  It never selects the normal application database. Cluster retained after shutdown.
- Fresh run passed all 8 PostgreSQL tests and all HTTP/BFF checks: consent before
  joining, invitation before registration, two-user isolation, login persistence,
  refunds, debt-plan reopen/conflicts, upcoming edits/payment states and duplicate
  review authentication/origin checks. Command log: `/tmp/worthlane-postgres-verification.log`.
- `corepack pnpm --filter @worthlane/desktop typecheck` and `git diff --check` passed.
  Direct formatter assertions passed for 3347, -3347, 1, 30000 and 30001 minor units.
- These are persisted API/BFF checks, not interactive UI, native reminder delivery
  or new Plaid Sandbox proof. Remaining acceptance includes unknown-identity account
  reconciliation, native Sandbox/reminders, integrated interactive/restart journeys
  and regression builds. No production actions or spending in this milestone.

## 2026-09-10 — explicit desktop solo setup and browser persistence

- Browser verification found desktop setup only offered Create household. Added
  explicit Just me / Couple or family selection, generic name placeholder, private
  solo wording and Create my plan action. Both use the existing one/two-member model;
  choosing solo never requires an invitation and can later add one consenting partner.
- Interactive browser against the retained local PostgreSQL database: registered a
  new synthetic login, selected Just me, created Morgan's My plan, added Solo wallet
  with $1,234.56, signed out, signed back in and saw the same plan and exact balance.
  Dashboard marked the wallet Personal. Browser reported no page errors. Screenshot:
  `/tmp/worthlane-solo-persisted.png`. This verifies these actions, not a full solo
  budget/bills/debt journey or the second partner UI.
- Runtime: restarted retained synthetic cluster on 55439 and ran
  `WORTHLANE_TEST_DATABASE_URL=postgresql://worthlane_test@127.0.0.1:55439/worthlane_beta_test node scripts/test-http.mjs --interactive --interactive-minutes=60`.
  Existing full HTTP/BFF checks passed before interactive testing. Browser commands
  used `npx --yes agent-browser --session worthlane-beta` (open, snapshot, select,
  fill, click, screenshot, errors). Desktop typecheck and diff check passed.
- Unknown-identity reconciliation remains incomplete; no heuristic merging added.
  Integrated partner/restart journeys, native Sandbox/reminders and regression builds
  remain required. No production actions or spending.

## 2026-09-10 — desktop manual activity fallback

- Continuing the solo browser journey exposed a missing desktop entry path for
  manual spending. Reports now offers explicit manual account, category, amount,
  description, local date/time and expense/refund/income/transfer treatment.
  Transfers/card repayments are excluded; refunds are negative credits. Agreed
  responsibility remains independent of payment account. Saves refresh the workspace.
- Added a narrow authenticated BFF collection POST with same-origin validation,
  allowed fields, nonzero amounts, cent precision and refund-sign validation.
- Interactive synthetic Morgan account: created a $600.01 Groceries responsibility
  assigned entirely to Morgan, entered a $23.47 purchase then a $3.47 refund on Solo
  wallet/Food & Drink. Reports showed both retained rows and $20.00 applied to the
  unchanged plan. Restarted API/desktop via the HTTP harness and reloaded the browser;
  exact values remained. Screenshot `/tmp/worthlane-manual-activity.png` after load.
- `corepack pnpm --filter @worthlane/desktop typecheck` and `git diff --check` passed.
  React/accessibility review retained labeled native inputs, required explicit
  account/category selection and pending-submit prevention. Browser errors empty.
- Extended `scripts/test-http.mjs` with manual expense/refund persistence, anonymous
  rejection, cross-origin rejection, forged fields, zero/fractional-cent inputs,
  positive-refund rejection and partner-account isolation. Full HTTP suite passed
  against retained loopback PostgreSQL; `/tmp/worthlane-interactive.log`.
- Remaining: full solo bills/debt and two-user interactive acceptance, unknown-
  identity account reconciliation, native Sandbox/reminders and regression builds.
  No production actions or spending.

## 2026-09-10 — fresh Plaid Sandbox backend validation

- User explicitly requested full Plaid setup. Located existing Sandbox credentials
  in the older local finance checkout, verified its environment is sandbox, and
  copied only Plaid client/secret/environment into ignored mode-0600 API local config.
  No credential values were printed, committed or sent to Notion.
- Ran `WORTHLANE_TEST_DATABASE_URL=postgresql://worthlane_test@127.0.0.1:55439/worthlane_beta_test node scripts/run-plaid-integration.mjs`.
  Passed real provider test in 14.88 seconds: encrypted Item persistence, accounts,
  Liabilities statement/minimum/due-date fields, transaction sync/replay, owner
  isolation, forced login-required recovery state/update-token creation and unlink.
  Test-created Sandbox Item removed. Log `/tmp/worthlane-plaid-sandbox.log`.
- This is backend Sandbox evidence. Interactive Link/reconnect completion, native
  configuration and reminders remain open; no production activation claim.
- Before Plaid setup, browser saved Morgan card payoff: $100 current balance, 0% APR,
  $10 minimum, $50 monthly budget, estimated October 2026 payoff and $0 interest.
  Browser also created monthly Internet bill $45.67 due September 20 and invoked
  Record paid and advance date. Bill's advanced date and saved-plan reopen still
  need independent readback. Created an invitation and registered a separate Avery
  login; acceptance and partner visibility checks remain next. Synthetic data only.

## 2026-09-10 — visual refresh direction requested

- User added an aesthetic UI revamp using HCI/psychology and allowed logo changes.
  Began desktop direction: ivory canvas, forest navigation, soft chartreuse selection,
  serif page headings, quieter shadows, larger controls, tabular financial numerals
  and reduced-motion support. W mark now suggests two paths with a shared horizon.
- Renamed Shared goals navigation to Goals & bills so due dates and debt tools can
  be found by recognition. No financial or permission semantics changed.
- Desktop typecheck/diff check passed. Browser reload verified computed ivory canvas
  and forest navigation; no browser errors. Screenshot `/tmp/worthlane-warm-ui.png`.
- This is a first desktop visual pass, not completion of the requested revamp.
  Remaining design work: page composition/progressive disclosure, mobile consistency,
  responsive and contrast checks, logo consistency across assets, complete journey QA.
  Full Plaid setup remains an explicit workstream alongside beta acceptance.

### 2026-09-10 — Consenting second login and category privacy

- Interactive: Avery registered in an independent browser session after Morgan created an invitation, explicitly accepted it, and saw the persisted $600.01 grocery responsibility plan. Morgan's personal wallet and $20 net grocery activity remained hidden; Avery's visible account total was $0.
- Fixed POST/PATCH transaction category authorization: only system categories or categories owned by the authenticated user may be attached. Missing and partner-private category IDs return 404; clearing remains supported.
- Verification: API typecheck passed. Real PostgreSQL-backed HTTP suite passed, including new cross-partner category denial, own-category persistence and clearing, plus invitation/login, transaction, debt-plan and upcoming regressions.
- Next: interactive Plaid Sandbox Link/reconnect, shared visibility and budget split readbacks, mobile visual consistency and native checks. Production remains unmodified.

### 2026-09-10 — Brand consistency and clearer task labels

- Extended the desktop cream/forest direction to mobile light and dark semantic palettes, with sage dark-mode actions and softer card corners. Replaced stale loss-aversion design-token commentary with explicit status-label guidance.
- Desktop headings now describe useful actions: accounts/sharing, bills/payoff/goals, and spending/manual entry. Goals & bills content is discoverable from both navigation and page description.
- Validation: desktop and mobile typechecks pass. Contrast calculations: muted cream text 4.87:1, white primary-action labels 5.55:1, dim dark-surface text 4.97:1, dark-mode primary labels 12.10:1. Native visual verification remains pending; Expo web currently starting its filesystem crawl.
- Plaid interactive progress: real Sandbox Link opens; First Platypus Bank accepts user_good/pass_good and shows account consent. Continue does not yet advance in this browser session; backend provider tests do not replace this unresolved UI check. No production configuration or financial data used.

### 2026-09-10 — Connected Sandbox browser and shared split readbacks

- Browser: First Platypus Sandbox Link completed through account consent; Worthlane saved one institution, 14 accounts and 392 imported transactions. Reconnect completed and returned healthy. Repeated UI Sync left 392 rows in PostgreSQL.
- The previous consent stall was unreliable pointer activation in the automation session. Direct activation of the visible browser controls exercised the real Link/app handlers and completed the flow. Unlink remains to verify interactively.
- Two-login readback: Avery saw Morgan's $1,234.56 wallet only after Morgan enabled shared detail. Editing $600.01 groceries to equal split persisted as $300.01/$300.00; the $20 net grocery activity applied $10/$10 and showed $290.01/$290.00 remaining after partner reload.
- Replaced 14 repeated page-level bank notices with one expandable account-coverage notice; the incomplete-history warning remains visible when collapsed. Per-account source messages remain accessible in the disclosure.
- Fixed Expo web bundle parsing by enabling its supported web import.meta transform (Zustand ESM had crashed before React mounted). Guarded runtime Sentry config strings so optional telemetry cannot crash launch; default PII collection is disabled. Mobile/desktop typechecks and diff whitespace checks pass. Expo web then reached the unsupported native SecureStore boundary, so this is not a claim of web/mobile auth equivalence.
- Native verification: generated a local iOS simulator project, installed 106 pods including ReactNativePlaidLinkSdk 13.1.0, booted an iOS 18.3 simulator, and started a local unsigned Debug build. Build and native journey evidence pending. No production changes or spending.

### 2026-09-10 — Telemetry cannot block private-session cleanup

- Removed email attributes from mobile analytics identity calls and disabled GeoIP enrichment. Analytics retains only the opaque user identifier when configured.
- Wrapped optional identity/event calls so telemetry failures do not block sign-in. Logout no longer awaits analytics network flushing; failed event capture/reset cannot prevent auth token and private-cache cleanup.
- Added CI tests executing the real auth store with failing analytics and offline API adapters. Both pass: hydrate/login/biometric login remain usable without email enrichment; offline logout clears all session credentials, private query cache and reminder ownership despite analytics exceptions. Mobile typecheck passes.
- Native simulator build remains live and compiling. Browser automation hit a daemon/resource error during the build; pending custom-split/unlink steps are not marked verified.

### 2026-09-10 — Explicit joint-account identity consent

- Added an additive household account-match table and authenticated list/confirm/revoke API. Bank connections without a common provider identity require each owning login to confirm. Pending matches do not affect totals; confirmed pairs count one visible balance/feed, preferring the viewer's own connection. Records and payer attribution remain intact.
- Private/summary-only accounts cannot be proposed; both owners must first share detail. Known conflicting provider identities and mismatched account types are rejected. Either owner can revoke; withdrawing shared detail clears manual identity consent. Household locking coordinates competing matches and privacy withdrawal.
- Desktop Accounts includes an expandable match review, explicit same-account confirmation, pending/confirmed state and removal controls, through a strict same-origin authenticated BFF. Mobile match controls and interactive walkthrough still pending.
- Verification: 50 core tests, 148 API unit tests, API/desktop typechecks, and all 9 fresh PostgreSQL integration tests pass. New integration cases cover strict auth/payload, pending versus confirmed totals, preserved ledger rows, revocation, competing proposals, and simultaneous confirmation/privacy withdrawal. Migration applied only to isolated local databases.
- Native: initial unsigned build succeeded but launch exposed missing simulator Keychain entitlements. Rebuilt successfully using local ad-hoc simulator signing; installed build runtime verification continues. No production signing, deployment or spending.

Native checkpoint after 73ec1cf: simulator-signed iOS build launched to the cream/forest sign-in screen. Entered the synthetic Morgan credentials through Simulator controls; Today loaded real persisted Sandbox accounts and the $45.67 Internet bill (advanced to October 20). Household initially showed a recoverable error because the dev API held a pre-migration Prisma client. Restarted the local Next API through its config watcher and activated Try again; native household loaded My plan / Shared with Avery, -$75,929.59 visible net worth, the shared $1,234.56 manual wallet, and private-to-Morgan bank accounts. Native account/bank list is too long and still repeats 14 freshness notices; progressive disclosure and native match controls remain next. This does not prove native Plaid Link or partner-login isolation yet.

## September 10 — mobile household disclosure and account-match controls

Added native account-match review, owner confirmation and revocation controls using the existing authenticated API. Query caches are scoped to the signed-in user and household. The picker shows one selection step at a time, filters by account type, and requires an explicit same-account acknowledgement. Household bank coverage and account privacy expand on request; all source notices remain available. The two-member view no longer offers an impossible third invitation.

Interactive iPhone 16 Pro / iOS 18.3 verification against the retained synthetic PostgreSQL fixture: recovered the household after the temporary HTTP harness expired, opened the match modal, loaded 14 owner bank accounts from the API, selected Checking, verified the narrowed second picker and disabled confirmation, then returned to the persisted equal-split budget. Fixed a duplicate React key and modal status-bar overlap found during the walkthrough. Cream/forest styling, readable hierarchy and 48-point match controls checked in the simulator. Mobile typecheck and diff whitespace checks pass. This verifies native presentation/loading/selection, not a completed two-owner match mutation.

Remaining: actual two-login match confirmation/revocation walkthrough, native Plaid Link setup and lifecycle, partner-native privacy checks, reminder/debt walkthroughs and final regression acceptance. The prior one-hour Sandbox harness removed its remote temporary Items; its retained DB rows need lifecycle cleanup before those connections can be reused. No production changes or spending.

## September 10 — Sandbox lifecycle and native return-link preparation

Real Sandbox/HTTP verification reproduced the temporary-session lifecycle: baseline three existing PlaidItem rows, four while the new test connection was active, and three after cleanup. The HTTP suite passed and process exited 0. Cleanup now removes only this run's local bank accounts (cascading imported activity) and Item after successful remote removal, tolerates remote ITEM_NOT_FOUND, and preserves pre-existing fixtures. Old rows created by earlier harness versions remain an explicit cleanup task.

Added `scripts/dev-sandbox.mjs` for persistent local development with stable, ignored 0600 JWT/encryption/proxy keys. It started API 3301 and desktop 3303 against the isolated database; restart-with-bank-connection proof is still pending. This replaces temporary harness use for persistent acceptance, not the regression harness itself.

User confirmed ownership of worthlane.app and an individual Apple developer account. Read-only certificate inspection identified personal team 5FBXR5M5PJ. Public AASA endpoint returned 404. Prepared exact-path AASA JSON and a script-free OAuth return route; local HTTP checks passed JSON/app/path, callback 200, no query reflection, no-referrer and restrictive CSP. Callback opened interactively; web typecheck and production build passed. See docs/plaid-local-setup.md for release steps and precise limits. Paid membership/Associated Domains availability, actual signed app prefix, domain publication approval and Plaid dashboard registration remain pending; no public routes deployed and no spending.

## September 10 — restart persistence, native partner privacy and honest totals

`test-persistent-sandbox.mjs --create` registered a new synthetic login and saved 14 real Sandbox accounts through the API. Stopped the persistent development process, restarted it using its retained local secrets, then `--verify` passed: fresh login, unchanged account IDs and successful real Sandbox sync using the persisted encrypted token. The connection remains available for follow-up acceptance in the isolated database.

Native iOS interactive evidence: signed Morgan out, observed the cleared login screen, signed in as Avery, and opened Household. Avery saw only the shared manual wallet (1,234.56) and agreed 600.01 grocery budget, split 300.01/300 with 10 applied to each and 290.01/290 remaining. Morgan's 14 private bank accounts and bank notices did not appear. This completes the first native cross-login privacy readback; match mutations, reminders and debt interactions still require their own walkthroughs.

Found and removed the misleading Today availableBalance aggregate, which added positive loan/card balances and investments as if spendable. Today now displays the existing deterministic personal net worth with an explicit assets-minus-debts explanation. Native rendering confirmed the corrected -75,929.59 label/value on the cached Morgan fixture before the login switch. Condensed repeated household bank notices into a pointer to full coverage details; removed stale Settings copy saying Plaid was coming soon.

Server analytics now permits only reviewed method/platform/mode enum fields and disables geolocation. Email/profile updates, bank identifiers, institutions, goal identifiers and financial amounts are dropped centrally. SDK failure logs omit request details. Three new analytics privacy tests pass, including arbitrary-value rejection and failure handling. All 151 API unit tests pass after repairing a stale mock for the previously added household lock; four net-worth tests pass. API/mobile/desktop typechecks pass; final mobile typecheck after copy change passes. No production changes or spending.

## September 10 — approved public iOS return routes deployed

User explicitly approved publishing the prepared three website files. Read-only Vercel inspection identified existing project worthlane (root apps/web), production revision 10cd6fa and rollback deployment dpl_F1aBXdGJkywpqgbj2H5hMRVZqEv6. Created isolated release branch codex/plaid-return-release from that exact live revision, added only the three approved files, committed/pushed a48cb06, then deployed only the worthlane website project.

Production deployment dpl_6Fdf3WDxt6TjD4oE235MRatCv9VB is READY, URL https://worthlane-mecv7si5r-tymedina100s-projects.vercel.app, aliased to https://worthlane.app. Vercel compilation/typechecks/build passed. Public HTTPS assertions passed AASA and callback 200 without redirects, JSON content type, exact 5FBXR5M5PJ.com.worthlane.mobile + /plaid-oauth association, no query reflection or scripts, no-referrer and restrictive CSP. Homepage remains 200. Apple association CDN returns 200 and the expected personal app ID. Immediate deployment-scoped error scan returned no log entries; this is a short post-release check, not long-term monitoring.

Personal local provisioning profiles independently confirmed the same app-ID prefix; no existing profile enables Associated Domains for Worthlane yet. Native interactions paused when Computer reported the Mac locked and required manual unlock; no bypass attempted. Continue app entitlement setup and Plaid dashboard redirect registration when interactive access is available, and finish native bill/debt/matching journeys. No API/database production deployment, production Plaid activation or spending. Website approval is fulfilled and does not need to be requested again.

## September 10 — native bill-to-debt journey and first-run fix

Mac interaction resumed. With Avery's separate native login, created an 87.65 bill due September 20, reopened its editor, selected monthly recurrence and one-day-before device reminders, accepted the simulator notification permission, and received successful save feedback. PostgreSQL readback confirmed MONTHLY/ONE_DAY_BEFORE. Marking paid advanced the persisted date to October 20 while retaining recurrence/reminder choice. Actual future notification delivery remains unverified.

This exposed a real first-run bug: Today hid saved bills whenever the login had no accounts. Split the obligations section from the account snapshot so obligations appear for account-free users. Native readback now shows Avery's upcoming bill and its advanced date; mobile typecheck passes.

Created and previewed Avery native payoff through the app: 100 balance, 90 statement balance, 10 minimum, 0% APR, 50 monthly budget, confirmed September 25 due date. Preview correctly gave October payoff, zero interest and 50 first-month payment. Saved, navigated away, reopened from the plan list and verified all inputs plus the same estimate loaded from the API. Added the saved 10 minimum to Upcoming twice; the second action reported it already existed, and DB count was one with reminders NONE. Native Upcoming and Today displayed the single minimum and monthly bill. These checks prove persistence/navigation and idempotent conversion, not actual notification delivery or native Plaid OAuth. No new production changes in this milestone.

## September 10 — two-login account-match consent and revocation

Interactive iOS Avery and desktop Morgan used two explicitly labeled synthetic bank-feed copies in the isolated household, each with a 100 balance and duplicate 10 purchase. These were controlled source=PLAID fixtures, not new live Plaid connections. Avery confirmed first: pending status preserved separate counting (1,434.56 visible net worth; 20 grocery responsibility per partner). Morgan confirmed through desktop: confirmed status and desktop net worth changed by exactly 100, from -75,729.59 to -75,829.59.

The walkthrough exposed a native cache bug: refreshing match status after the other login confirmed left household totals stale. Refresh now also invalidates household summary and clears stale action feedback; desktop refresh clears stale action feedback too. Native interactive readback after refresh showed 1,334.56 and 15 responsibility each (285.01/285 remaining). Avery removed the match through native UI: success feedback, total restored to 1,434.56 and responsibility to 20 each. Desktop displayed restored -75,729.59; its match refresh was also exercised. PostgreSQL assertion verified zero matching records and both original accounts plus both transactions retained. Synthetic fixtures remain labeled for continued checks.

Mobile and desktop typechecks passed. Remaining acceptance work includes native Plaid OAuth/dashboard setup, interactive unlink/recovery, actual reminder delivery, final visual polish and regression; audit same-login duplicate-feed personal aggregates as well as household totals. This milestone made no production changes or spending.

## September 10 — personal duplicate-feed consistency

Audit found same-owner unknown-identity matches were allowed but affected only household totals. Added a shared personal-ledger selector that considers only the signed-in user's accounts and fully confirmed matches in an active household. Personal dashboard, budget/rollover calculations, spending/cashflow reports, current net worth and snapshots now use the same canonical feed. New calculations for nudges, budget streaks, recurring detection and chat context use it too. Original account/transaction review remains available; no ledger rows are deleted. Historical snapshots and previously sent nudges are not retroactively rewritten.

Fresh PostgreSQL integration suite passes all 10 tests, including solo duplicate feeds with expenses/refunds/income: before confirmation net worth 200, spending 16, income 60; confirmed 100/8/30 across dashboard, budgets, both reports and current net-worth route; revoke restores 200/16/60 with all 2 accounts and 6 transactions retained. Two-owner confirmed matching also asserts each personal dashboard keeps that login's own 100 balance/10 spending. All 151 API unit tests and API typecheck pass; existing isolated unit mocks updated for the ledger dependency. Interactive same-owner follow-up and final acceptance remain open.

User expanded scope to redesign the full worthlane.app website. Build and verify the complete couples-first marketing/support/legal presentation locally, aligned with app branding and truthful beta claims; obtain approval before publishing that redesign. Prior approval covered only the already-deployed return/AASA files. Native Plaid OAuth/signing, actual reminder delivery and broader visual acceptance remain unfinished. No production change or spending this milestone.

## September 10 — complete website redesign prepared

User requested the full worthlane.app redesign. Website-only b9fc0de replaces the old navy/manual-only launch site with cream/forest/clay branding, an original vector W mark, editorial typography, responsive navigation, and a couples-first narrative. Home illustrates Tyler/Rachel's 2,450 plan (1,470/980 responsibilities), separate ownership and consent. Interactive rent example supports 50/50 (850/850), 60/40 (1,020/680), and one-person (1,700/0), always preserving the 1,700 total and explicitly separating responsibility from who paid. Native radio controls and live feedback, visible focus, menu Escape/focus return, reduced-motion styling, semantic FAQ disclosures and a skip link support accessibility. This is a labeled marketing illustration, not new persisted app evidence.

Updated support/privacy copy to reflect the actual Sandbox beta status, sharing controls, analytics and sensitive-information boundaries. Replaced premature download/free claims with an email beta inquiry; no email was sent and no access promise made. Restyled terms, added branded 404, regenerated small icons and social preview, and corrected support/privacy/terms canonical URLs. Policy copy reflects implementation, not a claim of independent legal review.

Build/typechecks pass. Browser checks exercised splits, mobile menu and keyboard Escape, and the Plaid FAQ. Desktop 1440, phone 390 and narrow 320 widths pass overflow checks (fixed a decorative orbit overflow). Full-page desktop and phone captures are in docs/evidence/website-redesign. Built-site HTTP checks: home/support/privacy/terms 200, unknown route 404, social/icons 200; unchanged OAuth return 200 with no query reflection, AASA 200 JSON and expected personal app ID. Browser reported no page errors. Isolated website release commit 6a0ddb2 prepared/pushed on codex/plaid-return-release; publication still requires scoped approval. API/DB/native beta work is unchanged by this website commit.

## September 10 — approved full website redesign published

User explicitly approved publishing website-only release 6a0ddb2. Verified existing public rollback deployment dpl_6Fdf3WDxt6TjD4oE235MRatCv9VB, then deployed the isolated worthlane website project. New deployment dpl_HgwZAmoLmcwZk8rV5MLFFdskEE2P is READY at https://worthlane-pii36ameg-tymedina100s-projects.vercel.app and aliased to https://worthlane.app. Remote production build passed. No API/database/native deployment, production Plaid activation, or purchase was performed.

Live HTTPS assertions passed: new home title/couples beta copy, support/privacy/terms 200, branded missing page 404, social preview/icons 200; AASA 200 JSON with 5FBXR5M5PJ.com.worthlane.mobile and /plaid-oauth; OAuth return 200 with no synthetic query reflection, no-referrer and restrictive CSP. Opened the public website in a real browser and selected 60/40: 1,020 Tyler +680 Rachel =1,700 household total. Publication approval is fulfilled; website status is now live. Preserve this website release on the next production build (release branch has not been merged to main).

Immediate deployment-scoped error-log query (last 10 minutes) returned zero entries. This is a short post-release check, not proof of long-term production health.

## September 10 — device reminder self-check and delivery audit

Added Settings → Send test reminder so a signed-in user can check device delivery without entering a bill or exposing financial details. It schedules generic content after 10 seconds, replaces pending tests, respects permission denial, guards session changes during permission/scheduling, and clears queued/presented tests on logout. Test and actual obligation triggers now explicitly select the obligations channel on Android. No server or production changes.

Mobile typecheck passes; native-adapter reminder/Plaid/date suites pass all 19 tests (including generic test content, pending replacement, logout cleanup, permission denial and permission/session race). Actual iOS simulator UI invoked the test action and returned successful scheduling feedback. Backgrounded Worthlane and inspected Home twice but did not capture a notification banner. Settings search had no Worthlane result. Attempts to inspect Notification Center via gestures repeatedly failed with Computer noWindowsAvailable, even though AX reads and buttons still worked; no OS permissions were bypassed or clock changed. Actual OS delivery, physical-device delivery, and date-triggered 9 a.m. delivery remain unproven. This milestone is scheduling capability and test coverage, not a delivery acceptance pass.

## September 10 — calm messages and private remote nudges

Audit found legacy pressure copy still reachable in personal budgets, the server nudge engine and chat instructions despite superseding product principles. Replaced savings-loss/streak-threat language with concrete remaining amounts and optional next steps; monetary nudge details now retain cents. Recurring-charge nudges explicitly say estimated/prediction, not confirmed due date. Removed the stale architecture description in AGENTS.md.

The same audit found server nudges passed merchant names, amounts and goal details into remote push bodies. The push helper now accepts only userId and constructs a fixed generic title/body with empty data; detailed nudges remain behind app authentication. Added exact outbound-payload and missing-token tests plus a recurring-estimate disclosure test. All154 API unit tests and API/mobile typechecks pass. No production push, real message, API deployment or spending was performed. This fixes content/privacy behavior; actual notification delivery remains a separate unverified acceptance item.

## September 10 — recoverable web Link startup failure

Native Link correctly requires PLAID_IOS_REDIRECT_URI; dashboard registration/signing are still unfinished, so that guard was not bypassed. Switched desktop to Avery's separate synthetic login and attempted real Sandbox Link. API link-token returned200, but the in-app browser's Plaid frame stayed blank and Connecting never finished. No bank connection was established.

Fixed PlaidLinkButton with a30-second launch deadline, explicit cancellation, cleanup on unmount, attempt guards for late token/SDK callbacks, and one-shot success handling. Once Plaid's documented stable OPEN event arrives, the launch timer stops so users can complete consent at their own pace. Saving is distinct from connecting and cannot be falsely cancelled mid-exchange. Reference: https://plaid.com/docs/link/web/ .

Four tests execute the actual component with controlled React/SDK/timer adapters: blank-frame timeout/late success, cancel during token retrieval, OPEN without deadline/single exchange, and unmount cleanup. All pass; desktop typecheck passes. Actual browser reproduced the blank-frame timeout, displayed a retry/other-browser/manual message and restored Connect bank. A second attempt was cancelled interactively with clear feedback. Local PostgreSQL readback retained Avery's original single labeled fixture account and zero Plaid Items. The real recovery/reconnect/unlink walkthrough remains pending; successful timeout/cancel is not a bank connection acceptance pass. No production change or spending.

## September 10 — native brand installation and budget-period consistency

Generated original vector-derived forest/cream W app, adaptive, splash and notification assets aligned with the public website. Added accessible Worthlane lockup to login and registration, with calm couples/solo copy. Mobile typecheck and Expo iOS prebuild pass; ad-hoc simulator-signed Xcode build succeeded. Installed and launched on iPhone 16 Pro iOS 18.3. Existing Avery session loaded persisted $100 personal net worth, $1,434.56 visible household total and two saved upcoming items. Signed out through confirmation and visually verified both branded login and registration screens with accessible Worthlane identity. This is a simulator installation, not a physical-device or App Store release. Android assets are generated but Android rendering has not been interactively verified.

Budget nudge audit found all periods incorrectly used the server's current month. Nudges now use the same household financial time zone and weekly/monthly boundaries as GET /budgets, exclude the next period's boundary and future transactions. Two regression cases prove Sunday-start weekly and monthly Phoenix ranges when UTC has already crossed into June. All156 API unit tests and API typecheck pass. This does not claim actual notification delivery or change the established Sunday-start week policy.

User approved production signup publication. Vercel marketplace returned integration_terms_acceptance_required before database creation: user must accept Neon marketplace terms at the opened Vercel page. No database has been provisioned or new website deployed yet. Use observed plan ID free_v3 when resuming, not free. Website release 3f05ca8 remains ready; prior production 6a0ddb2 remains live. Approval is recorded and must not be requested again.

## September 10 — foreground reminder delivery verified

Found no Expo foreground notification handler in the app; SDK54 otherwise suppresses presentation while open (https://docs.expo.dev/versions/v54.0.0/sdk/notifications/). Registered a handler for local obligation/test reminders belonging to the active login, with banner/list/sound enabled and no badge. Signed-out or other-login reminders are suppressed. Added a current-session/switch/logout regression test; all20 native adapter tests and mobile typecheck pass.

Actual iOS18.3 simulator interaction invoked Send test reminder and displayed the system banner over Worthlane with the new W icon, Your test reminder title, and generic no-payment-due text. This proves foreground presentation through the real OS for the10-second test trigger. A second background attempt did not capture a banner in the observation window; Notification Center gesture returned Computer noWindowsAvailable. Background/date-triggered/physical-device delivery remain unproven, not marked passed. New app icon also visually verified on simulator Home Screen. No production app change or spending.

## September 10 — background test delivery confirmed through OS history

Added Settings → Check last test, which reads Expo's actual scheduled/presented notification APIs for the current login. It distinguishes pending, presented, absent/inconclusive and stale-session states. Sending a new test dismisses older test history first, preventing an older successful test from being mistaken for the new one. It does not infer delivery from a scheduling success or an empty queue, and does not claim sound/banner proof from notification history. Added history-isolation/state and old-test-dismissal tests; all22 native adapter tests and mobile typecheck pass.

Actual iOS18.3 interaction: scheduled a fresh test, dismissed the scheduling dialog, backgrounded Worthlane to Home, waited beyond10seconds, returned without restarting/signing in, then pressed Check last test. Device-backed result was Test reached notification history. This proves presentation of the new test while backgrounded, with the previously cleared history and no pending test. Combined with prior directly observed foreground banner, both foreground and background10-second test delivery are verified on the simulator. Physical-device delivery and the real9a.m. bill-date trigger remain separate acceptance checks. Plaid dashboard inventory still shows the sign-in page; native redirect/dashboard setup remains pending. No production app changes or spending.

## September 10 — physical signing prerequisites verified

Previous milestone was progress: background test presentation was proven and pushed.
Current paired-device read found Tyler's iPhone16ProMax available with Developer Mode enabled.
Attempted an actual personal-team automatic-provisioning Debug build. Xcode failed with
No Accounts plus cached wildcard profile missing Push Notifications/aps-environment.
No device install occurred and no capability was removed to obtain a misleading pass.
The next action is Xcode personal-account sign-in/profile setup, not another simulator build.
Xcode Computer inspection returned AXError.cannotComplete; signing CLI error remains authoritative.

Chrome attempt for desktop Sandbox Link was explicitly blocked by another extension UI
and requires user dismissal; no bypass attempted. Plaid dashboard still shows sign-in.
Updated docs/plaid-local-setup.md with these exact prerequisites and removed its stale
request for already-fulfilled website publication approval. Website signup is live;
no further production action or spending in this milestone.

## September 10 — draft candidate, independent CI and isolated HTTP regression

Re-read the authoritative Notion acceptance criteria. Full persistent solo/two-user flows and interactive Sandbox lifecycle on supported clients remain mandatory; a physical-device run is useful release evidence and a prerequisite to claiming phone readiness, but must not silently replace or expand the brief's core beta stopping condition. Plaid dashboard rechecked live at sign-in. Opened draft PR15 (https://github.com/tymedina100/worthlane/pull/15) against freshly fetched main10cd6fa, with remaining banking/signing limitations explicit. No merge or production app deployment.

CI run96/34520804063 on ddeac8d passed real PostgreSQL integration, workspace typecheck, shared rules/contracts/API/native-adapter/auth/security tests, mobile bundle and API/desktop/web builds. Windows packaging failed: its configured website favicon was192px, below the builder's256px minimum. Pointed executable/packaged branding at the matching1024px mobile mark and added a PNG dimension regression; all15 desktop-native tests pass locally. Windows packaging verification for this fix is pending the next PR run. Added existing four passing web Plaid lifecycle tests to CI.

Fresh `WORTHLANE_TEST_PORT=55443 bash scripts/test-postgres.sh --http` initially passed10 database tests but refused HTTP startup on occupied persistent-demo ports. The harness now defaults to3316/3317 with validated overrides and per-process Next output directories. It restores only its own generated Next config references, preserving concurrent external edits. A full rerun passed10 persisted tests and all HTTP/BFF checks: registration/HttpOnly sessions, invitation-before-registration, two-member consent/privacy, refund/category saves, logout/relogin, debt save/reopen/revision conflicts, obligations/edit/paid/unpaid/deactivate, and strict auth/origin/payload validation. Exit0; isolated cluster stopped; original generated config files restored; persistent API3301 still listening. Log /tmp/worthlane-isolated-harness-verification.log. No real bank data or production DB used.

## September 10 — complete candidate CI regression passed

GitHub Actions run97/34521260627 on9f2175b finished with all three jobs successful:
PostgreSQL integration, main CI and native Windows. Verified each final job outcome.
This includes workspace typechecks, shared rules/contracts/API/native-adapter/auth
privacy/web Link lifecycle/desktop security tests, iOS bundle export, API/desktop/web
builds, and actual Windows packaging plus package verification. The192px icon
regression is fixed on the Windows runner, not merely inferred from local tests.

Added docs/beta-acceptance-status.md to index the brief's requirements and existing
evidence. Full interactive Sandbox connect/reconnect/recovery/unlink/native OAuth
is still incomplete; CI success does not close that gate. PR15 remains draft.
Plaid/Xcode account prerequisites remain as documented. Vercel's existing PR
integration also created preview website/desktop deployments; these are previews,
not a new production app release or proof of a configured beta backend. No merge,
financial production migration, live Plaid activation or purchase performed.


## September 10 — Plaid return registration verified

Tyler completed Xcode/Plaid sign-in and connected the phone. After explicit approval of the shared Plaid redirect setting and user password verification, reopened Developers/API and verified `https://worthlane.app/plaid-oauth` persisted alongside the existing Railway URI. Configured the ignored local API redirect and mobile associated-domain environment. No production Plaid activation or spending. Native device build remains running; signed entitlement, installation and complete interactive banking lifecycle remain unverified. TylerOS project and Plaid task updated with evidence and next steps.


## September 10 — interactive desktop Sandbox connection and signed phone installation

Code remains 9f2175b (documentation head 502d7d4). In the in-app browser, Avery's persisted synthetic login loaded the saved household. The first Link attempt timed out while the local API was slow during device compilation; recovery copy and manual fallback appeared. Retried after API recovery: actual Plaid Sandbox UI opened, selected First Platypus Bank, used synthetic user_good/pass_good, completed account consent without a phone number or Plaid account. Worthlane displayed Connection saved, one healthy institution, 14 new accounts, all Personal by default. Reconnect/sync/unlink and second-user privacy recheck remain next; this is Sandbox evidence only.

Generic iOS Debug build succeeded after Xcode sign-in. Ran `corepack pnpm exec expo prebuild --platform ios --no-install` with the ignored associated-domain environment; incremental automatic-provisioning build also succeeded. `codesign -d --entitlements :-` verified application identifier `5FBXR5M5PJ.com.worthlane.mobile`, development aps-environment, and `applinks:worthlane.app`. `xcrun devicectl device install app` installed com.worthlane.mobile on the connected iPhone successfully. Logs: /tmp/worthlane-generic-build-after-signin.log, /tmp/worthlane-associated-domain-prebuild.log, /tmp/worthlane-associated-domain-build.log, /tmp/worthlane-device-install.log. Phone launch, reachable API, actual native Link/OAuth and reminders remain unverified. No production financial release.


### Desktop Sandbox sync and reconnect follow-up

Clicked Sync on Avery's saved First Platypus connection: UI confirmed synced. Completed actual reconnect Link account consent without phone/account signup: UI confirmed Connection saved. PostgreSQL read-only queries before/after reconnect each returned one HEALTHY Item, needsRelink=false, HISTORICAL_UPDATE_COMPLETE,14 accounts and392 transactions. This proves ordinary reconnect preserved counts; forced-error recovery and unlink are still separate pending checks.


Switched through actual Sign out and separate Morgan login after Avery's bank connection. Morgan's dashboard lists Morgan's existing14 personal bank accounts plus the original wallet/joint fixtures; the only Avery row is the previously shared Joint test copy. Avery's new14 personal bank accounts are absent. Names/balances are similar because both use synthetic Plaid fixtures, so owner labels and row membership—not total equality alone—support the privacy observation.


## September 10 — forced Sandbox error recovery and stale-status fix

Used Plaid sandboxItemResetLogin only on Avery's synthetic Sandbox Item (exact local user, one Item, sandbox token guard). Actual desktop Sync returned re-link-required, exposing a defect: error displayed while connection still read Healthy/zero attention. Updated workspace bank mutations to refresh persisted state before reporting failures; starting new Link clears previous sync feedback. Actual required reconnect requested synthetic pass_good, completed consent, and restored Healthy with zero attention. Repeated Sandbox reset after the fix: starting from Healthy, one Sync now returned Needs Relink,14 accounts needing attention and incomplete-spending warning in the same completion update. Saved balances remained visible. Connection intentionally remains reset for the upcoming unlink check.

`corepack pnpm --filter @worthlane/desktop typecheck` passed; `node --test scripts/test-plaid-web-lifecycle.mjs` passed5 tests, including regression executing the workspace mutation callback to verify failed mutations refresh before throwing. Full remote regression/build awaits the pushed code revision. Native runtime and unlink remain pending.


## September 10 — desktop Sandbox unlink verified

Used actual Unlink on Avery's reset First Platypus Item. UI confirmed unlinked; reload shows zero connected institutions, only the original shared test copy, and visible net worth restored to1,434.56. PostgreSQL confirms Avery retains1account/1transaction while Morgan retains16accounts/395transactions. The removed Item no longer exists locally. A private verification script decrypted the saved synthetic token only in memory and called Sandbox itemGet: Plaid rejected the revoked token. No credential values were printed. The actual desktop connect/sync/ordinary reconnect/forced-error recovery/unlink lifecycle is now demonstrated. Native Link/OAuth remains pending despite signed installation.


## September 10 — latest regression and native launch checkpoint

CI98/34525382333 on4637de3 completed successfully: ci, postgres-integration, native-windows all success. Local API issued an iOS Sandbox Link token with HTTP200 (token value not retained in evidence). Associated-domain simulator build succeeded in /tmp/worthlane-associated-simulator-build.log, installed and launched com.worthlane.mobile on the booted iPhone16Pro18.3 simulator. Native interactive completion remains unproven: Computer getApp reports noWindowsAvailable/timeouts, including repeated exact active-Xcode Simulator path; physical iPhone currently unavailable. Asked Tyler to bring Simulator foreground. No build restart or additional native completion claim based on observation failures.

## September 11 — laptop-only simulator access and expired-session recovery

Per Tyler's instruction, all further native checks use the laptop simulator; the phone is excluded. Restored the existing persistent local API/database and Metro. Local Maestro 2.10.0 can read and interact with the iPhone 16 Pro simulator through XCTest, resolving the previous Computer window-access limitation. Analytics are disabled on Maestro test runs.

The actual simulator opened with revoked refresh credentials and misleading connection-error screens. API logs showed repeated refresh401 responses. Fixed mobile rejected-session cleanup: clear identity, private query cache and reminder session without recursively calling logout; retain credentials for temporary refresh failures. Added protected navigation for every private root route. The simulator then displayed Sign In, accepted synthetic Avery credentials and reopened the persisted dashboard showing personal net worth100, the saved10 card minimum and87.65 internet bill. Evidence: `docs/evidence/2026-09-11/native-expired-session-signin.png` and `native-restored-session.png`. Some Maestro flows reported selector/keyboard errors after successful earlier steps; those flows are not counted as wholly passing tests.

`node --test scripts/test-auth-privacy.mjs scripts/test-mobile-session.mjs` passed9 checks for concurrent single refresh, rejected/missing sessions, temporary failures, incorrect login credentials, old-refresh/new-login isolation and local privacy cleanup. Mobile typecheck and diff whitespace check passed. Added the session suite to the existing CI auth-privacy command. Reminder warning padding now respects the device top safe area. New code still needs remote regression; native Plaid lifecycle remains incomplete and is next. No production changes or phone actions.

CI99/34635576604 on2eeb062 subsequently passed all three jobs (ci, postgres-integration, native-windows). A cold simulator relaunch restored the session without the hook-order warning seen during live development edits. Native Connect bank issued a Sandbox Link token and opened the actual Plaid phone-optional introduction; continued to institution selection. Institution search/authorization and the remaining native lifecycle are not yet complete. Do not count a broad Plaid-text selector as proof of connection: it also matches Settings fallback copy; actual simulator screenshots were inspected.

## September 11 — native OAuth failure and safe cancellation checkpoint

Actual simulator flow reached First Platypus Bank - OAuth (ins_129644), opened the bank's cdn.plaid.com sign-in in the native browser, entered published Sandbox user_good/pass_good and1234, traversed account consent and final terms, and returned to Plaid. Plaid reported it could not connect; exiting returned to Worthlane's “The authorization flow did not complete” alert. This is failure/cancellation evidence, not a completed connection or successful OAuth verification. PostgreSQL read after exit confirmed Avery still had zero PlaidItems. Screenshot: `docs/evidence/2026-09-11/native-oauth-incomplete.png`.

The confirmation page did not list selected cash accounts, so account selection and return handling both remain under investigation; do not assert a root cause yet. A fresh native Link session is being retried with explicit account-selection verification. Temporary local diagnostics log only a validated uppercase Plaid error enum, never callback payloads, tokens, identifiers or account data. Remove temporary diagnostics after diagnosis. No phone or production actions.

## September 11 — correct the simulator Apple team association

Inspected the previous simulator build's `Worthlane.app-Simulated.xcent`: it contained the older3GPNQSXUJH application prefix, while the approved live AASA uses personal team5FBXR5M5PJ. The simulator's ordinary code-signature entitlements were empty; relying on that inspection alone would miss its simulated entitlements. This is a concrete configuration mismatch discovered during the failed native OAuth investigation, not proof that every failure cause is resolved.

Added `APPLE_TEAM_ID` to mobile configuration and the example environment, with a clear error when a domain is configured without a team or when the team format is invalid. Set the ignored local team to5FBXR5M5PJ. Regenerated iOS and built with explicit DEVELOPMENT_TEAM=5FBXR5M5PJ, CODE_SIGNING_ALLOWED=YES, CODE_SIGN_IDENTITY=-; `/tmp/worthlane-personal-team-simulator-build.log` ended BUILD SUCCEEDED. Parsed the built executable's `__TEXT.__entitlements` section and compared its exact application ID/domain with live HTTPS AASA: match. Evidence JSON is committed under docs/evidence/2026-09-11. Installed and launched only in the laptop simulator (PID51526). Native Link/OAuth must still be repeated with the corrected build. The temporary enum-only diagnostics were removed without shipping them.

Direct configuration assertions passed explicit matching team/domain, malformed team rejection, missing-team/domain rejection and unconfigured development fallback. Diff whitespace check passed. Refreshed stale physical-device setup notes to distinguish historical installation from the current laptop-only workflow. No phone access, production deployment, new account or spending.

## September 11 — native return routing defect fixed

On corrected Apple-team build78b2ee8, repeated actual First Platypus OAuth login/MFA and verified a visibly checked Plaid Checking account before consent. Authorization still failed, so the team correction alone did not solve OAuth. The bank's blank cash-account confirmation list is not reliable selection evidence: its public Sandbox script adds the hidden class even on selection. No provider-page modification or bypass was used.

Following Plaid's official troubleshooting guide, verified Apple's CDN serves the matching AASA and opened the exact HTTPS callback directly with simctl. It launched Worthlane but then Expo rendered Unmatched Route at /plaid-oauth. Added +native-intent.ts to map only Worthlane's exact bank return paths to the protected Settings route, stripping callback parameters from navigation while leaving authorization to the native Plaid SDK. Unrelated and malformed links keep normal routing. The actual same HTTPS callback with a synthetic state parameter now displays the persisted Settings screen. Before/after screenshots: native-bank-return-unmatched.png and native-bank-return-settings.png under docs/evidence/2026-09-11.

Eleven targeted auth/session/native-return tests passed, mobile typecheck passed, and diff whitespace checks passed. CI100/34638570386 for preceding source78b2ee8 also passed. Full OAuth remains incomplete; a fresh flow with temporary local error-enum-only diagnostics is running. Diagnostics are excluded from this routing commit. Next: resolve the returned provider error, verify full native connect/sync/recovery/unlink and check native failed-sync freshness. Laptop only; no production or phone actions.

## September 11 — actual native OAuth and selected-account import pass

With45b97ea, completed a fresh First Platypus Bank - OAuth session in the laptop simulator: login, MFA, visibly selected Checking, bank consent and return to Plaid. Plaid displayed exactly the selected Checking account. Continued and chose Finish without saving to avoid a separate Plaid consumer account; Worthlane showed Bank connected and imported activity. Temporary local diagnostic logging produced no error and was removed after this successful flow. No callback payloads or secrets were logged.

Fresh PostgreSQL read confirmed Avery now has1 HEALTHY Item, needsRelink=false, HISTORICAL_UPDATE_COMPLETE and a saved sync time;2 total accounts and150 transactions comprise the original1account/1transaction plus1 selected bank account/149 imported transactions. Morgan remains1Item/16accounts/395transactions. Evidence screenshots: native-oauth-return-selected-account.png and native-imported-activity.png. Counts remaining unchanged for Morgan support isolation of this import, not a substitute for the next separate-login visibility check.

Some automation segments failed to dismiss the bank keyboard or tap controls despite reporting a tap; they are not counted as full-flow passes. Actual screenshots and database results support the successful resumed journey. The SDK's optional account-selection confirmation list was blank, but the visible checkbox before consent and the one-account Plaid return/import resolve that ambiguity. Native sync, forced-error recovery/reconnect, unlink and App2App remain open. Cold relaunch is underway for persistence verification. All work remains laptop-only Sandbox; no production actions.

Cold-restarted com.worthlane.mobile after removing temporary diagnostics, then reopened Settings through the actual tab. The saved institution remains Healthy with1account,110 checking balance and available history loaded. Screenshot: native-bank-reopened.png. This verifies native persistence across an app restart. Ordinary Sync now test is next.

## September 11 — native sync and failed-sync freshness fix

Actual Simulator Sync now reached the API with200 and advanced Avery's saved lastSyncAt to19:55:37 UTC while keeping2accounts/150transactions. Earlier Maestro taps reported completion without an API request; direct laptop Simulator interaction resolved that automation issue and is the supporting input evidence.

Reset only Avery's exact local Sandbox Item with sandboxItemResetLogin. Actual native Sync returned409; the database persisted NEEDS_RELINK/ITEM_LOGIN_REQUIRED, but the screen remained Healthy with no alert. Screenshot native-failed-sync-stale.png proves the mismatch. Changed native sync to refresh persisted financial queries on both success and failure before displaying an error. Bank connect/repair/unlink now also invalidate household totals, budgets, net-worth, reports and recurrence. Late completion and unlink-confirmation actions are guarded against a changed login.

Repeated actual Sync after the fix returned409 and displayed Could not sync / institution needs re-link, with the Needs relink status, incomplete-spending warning and saved110 balance visible behind the alert. Screenshot native-failed-sync-repair-message.png. Five executable mutation-callback tests cover refresh-before-error, successful refresh, late results across logins, login change during refresh and uncertain unlink results; all passed. Mobile typecheck passed. Added the suite to CI's existing auth/privacy command. The first healthy-to-error transition after a successful repair remains a follow-up check; current evidence proves the stale defect before changes and the corrected failed operation after changes. Native repair/unlink/App2App and final acceptance remain pending.


## September 11 — required native OAuth repair preserves saved records

On pushed code 87d6156, completed the actual native Relink flow after a forced
Sandbox login expiration. Used the published lowercase Sandbox credentials,
selected the existing checking account, returned through OAuth, and completed
Finish without saving. The app displays Connection repaired and Healthy.

Fresh `node .tmp/native-lifecycle-state.mjs` passed after the asynchronous sync
completed: same Item, same account IDs, same transaction IDs; Healthy and no
relink flag; 2 total accounts and 150 transactions. The comparison uses the
pre-repair private snapshot, not just aggregate counts. An earlier check ran
before sync completed and correctly still observed Needs relink; the later
assertion and native success screen provide completion evidence. Screenshot:
`docs/evidence/2026-09-11/native-required-repair-success.png`.

CI101/34640584603 (45b97ea) and CI102/34641852325 (87d6156) passed all three
jobs: CI, PostgreSQL integration and native Windows packaging.

Repeated Healthy-to-error transition also passed: after a second Sandbox reset,
Maestro tapped the actual native Sync now control. The app immediately displayed
Could not sync, Needs relink, a missing-recent-activity warning and the retained
110 checking balance. Evidence: `native-repeat-expiration.png`. The macOS window
click helper was unavailable; Maestro successfully performed these native taps.
Next: native unlink/provider revocation, App2App and final brief audit.
No phone, live banking or production changes.


Native Unlink was then performed through the visible confirmation dialog.
`node .tmp/prepare-avery-unlink.mjs` captured the current encrypted Sandbox Item
reference before the action; `node .tmp/verify-avery-unlink.mjs` passed afterward:
Item removed, one original account remains, provider rejects revoked access token.
`node .tmp/native-unlink-preservation.mjs --snapshot` before confirmation and
`node .tmp/native-unlink-preservation.mjs` afterward proved exact IDs of the
original manual account/transaction and all Morgan Items/accounts/transactions
were preserved. These private helpers remain ignored and do not expose secrets.
Native screen shows Nothing linked yet. Screenshots: `native-unlink-confirmation.png`
and `native-unlinked.png` under the September 11 evidence directory.

Cold restart (`simctl terminate` then `simctl launch` for the laptop simulator)
retained the removal: dashboard restored original 100 net worth, 10 spending
and both saved upcoming bills; Settings shows Nothing linked yet. The first
Maestro tab-label tap did not navigate; a second coordinate tap succeeded with
an explicit Nothing linked yet assertion and a fresh screenshot. Evidence:
`native-unlinked-dashboard-reopened.png` and `native-unlinked-reopened.png`.
Native connect/sync/required repair/repeated error/unlink lifecycle is now proven
for the ordinary OAuth institution. App2App and final acceptance audit remain.


## September 11 — final instruction-drift follow-up

The acceptance audit found stale README/architecture sections still limiting
desktop to sync/unlink, requiring an already registered invitee, and listing
deterministic debt guidance and PostgreSQL CI as future work. Corrected those
statements against the implemented BFF routes, invitation service, saved debt
flows and CI workflow. Preserved the distinction between implementation,
interactive evidence and production release approval. `git diff --check` passed.
No executable code changed in this documentation correction.

App2App verification is in progress using the official Sandbox institution
First Platypus Bank - OAuth App2App (ins_132241). Actual Link search/selection
opened Safari, published Sandbox login/MFA succeeded, and the checking account
was visibly selected. Inspected the actual consent checkbox accessibility value
to select it after earlier reported taps did not change its state. Return and
import are not yet verified at this checkpoint. Official test procedure:
https://plaid.com/docs/link/oauth/#app-to-app-authentication .

App2App checkpoint: consent was visibly checked, and Connect returned from
Safari to the existing native Plaid session (Safari return indicator visible).
However, the SDK stayed at Log into First Platypus Bank instead of progressing
to selected-account confirmation. A delayed screenshot confirmed that state;
no exchange request occurred. Fresh local SQL still shows Avery with 0 Items,
1 original account and 1 original transaction. This proves app handoff only,
not completed App2App or import. Screenshots: `app2app-safari-bank.png`,
`app2app-checking-selected.png`, `app2app-bank-consent.png`,
`app2app-return-pending.png`. Next: trace SDK return events and session handling,
then finish the final brief audit. No production or phone action is required.


## September 11 — App2App completion and honest native cancellation

A fresh App2App attempt completed the actual Safari login/MFA/checking consent
and returned to Your accounts within native Plaid, explicitly naming First
Platypus Bank - OAuth App2App. Continue and Finish without saving completed
Bank connected. Fresh PostgreSQL read: HEALTHY, no relink flag,
HISTORICAL_UPDATE_COMPLETE, 2 total accounts/150 transactions (original manual
fixture plus selected checking and149 imports). Screenshots:
`app2app-return-selected-account.png`, `app2app-bank-connected.png`.
The prior stalled attempt remains recorded; its cause is not proven. Temporary
local diagnostics showed OPEN_OAUTH, then FAIL_OAUTH followed by SELECT_ACCOUNT,
SUCCESS and HANDOFF in the completed attempt; no error code was provided. Do not
label that intermediate event alone as a failed connection. Diagnostic code was
removed completely; no callback URLs, tokens or banking metadata were logged.

Separately, the previous cancellation displayed a false Plaid closed error.
The installed iOS v13 SDK source serializes a normal nil error as an empty
dictionary. Added `plaidExitError` to treat absent/empty errors as cancellation
while preserving real error codes and nonempty messages. Empty display messages
now fall back to the actual error message. Actual native verification opened a
new Link session, exited its consent screen, and returned to Settings without
Plaid closed; the existing healthy App2App account remained visible. Screenshots:
`native-cancel-false-error-before.png`, `native-cancel-no-error.png`.

Verification: `corepack pnpm --filter @worthlane/api exec vitest run --config
vitest.mobile.config.ts` passed24 tests including two new exit-payload tests;
`corepack pnpm test:auth-privacy` passed16; mobile typecheck and diff check passed.
The initial targeted test was not discovered until its explicit config include
was added; the final full suite includes it. Next: current CI, final persisted
client/privacy and platform coverage audit, and PR/task acceptance handoff.
All runtime work remains laptop-only Sandbox; no production changes or spending.


## September 11 — fresh two-login debt and bank privacy readbacks

Current code f47e5ffee31d829d0772a5c8b34904e5f59ac37c passed all three
GitHub CI103 jobs (run34645896747): ci, postgres-integration and
native-windows. Inspected terminal job/step conclusions through GitHub; this
includes the native cancellation tests and all existing regression builds.

Using actual browser session worthlane-final at localhost:3303, signed into
Morgan, opened Morgan card payoff, changed Method to Snowball and saved.
Signed out, signed into Avery, and opened Avery native payoff (created earlier
in the iOS app). Current100, statement90, minimum10, APR0, monthly50,
confirmedSeptember25 and October2026 estimated payoff persisted. Morgan’s plan
was absent. Repeating Add minimum to Upcoming returned “This due-date item
already exists”; a fresh database read retained exactly two Avery obligations.
Avery’s dashboard showed the personal App2App checking account; Morgan’s
private banking accounts were absent. Morgan’s preceding dashboard excluded
Avery’s personal App2App account. Account-owner/access labels, rather than
coincidentally equal Sandbox balances, establish these UI visibility checks.

Signed out of Avery, signed into Morgan again and reopened Morgan card payoff.
The fresh rendered selected option is Snowball, monthly50 and payoffOctober2026;
Avery’s plan is absent. Evidence files under docs/evidence/2026-09-11:
- morgan-saved-planning-readback.txt
- morgan-snowball-fresh-login.txt
- avery-bank-privacy-readback.txt
- avery-native-plan-desktop-readback.txt
- avery-debt-minimum-repeat.txt

Commands: agent-browser --session worthlane-final open/snapshot/click/fill/select
and get text body through its installed Node entrypoint; separate sign-out/login
forms were used, with synthetic test identities only. Snapshot files record
rendered controls, not seeded screenshots. No additional executable change or
production operation was made. Final acceptance remains open: finish integrated
solo coverage review, current platform coverage (especially Android), and final
PR/task handoff. Physical phone work is excluded by user instruction.


## September 11 — one fresh solo identity through saved planning

Created synthetic Jamie through the actual desktop registration form in browser
session worthlane-final. Selected Just me, entered Jamie, and created My plan
without an invitation. Added Jamie wallet1234.56 through Accounts & privacy.
Created Jamie groceries600.01, Food & Drink, One member/Jamie. Added expense23.47
and refund3.47 through Reports; rendered net spending20.00. After a fresh login,
the dashboard retained the personal wallet, Jamie-owned600.01 budget,20 applied
and580.01 remaining.

Saved Jamie solo payoff through Goals & bills: current100, statement90, minimum10,
APR0, affordable monthly50, Avalanche, startSeptember2026. Saved card dueSeptember25
and Jamie internet45.67 dueSeptember20, monthly. Actual sign-out, login and reopen
retained these values, October2026 payoff, zero estimated interest and100total
payments. No other identity's accounts/plans were visible. These are manual
fallback checks, not a new solo Plaid lifecycle claim.

Date-entry limitation: agent-browser fill and calendar clicks reported success
but left date values empty. Keyboard attempts also lost the original browser
session; a fresh sign-in recovered the persisted data. Used the native HTMLInput
value setter and bubbling input/change events on the visible due0/dueDate fields,
then actual Save buttons and fresh-login readback. This verifies form persistence,
not successful keyboard/calendar entry. No API calls or database writes were
used to populate this journey. Calendar interaction remains to be independently
checked with reliable control. The amount control's accessibility tree exposed
float32 precision, but rendered/saved amount is45.67.

Evidence: docs/evidence/2026-09-11/jamie-solo-{account-created,spending,
fresh-login,plan-and-bill,plan-fresh-login,bill-fresh-login}.txt.
Commands used the installed agent-browser Node entrypoint with session
worthlane-final: open, snapshot -i, fill, select, click, get text body and the
explicit DOM date-fill fallback described above. No executable changes; current
code retains CI103 proof. Next: independently resolve calendar interaction,
actual date-trigger reminder delivery, current Android banking and final PR audit.


## September 11 — actual keyboard/calendar dates resolved

Using the existing Jamie login, clicked the rendered card due-date Day segment,
pressed ArrowUp then Tab. Read-only DOM inspection showed2026-09-26, changed
fromSeptember25. Clicked Save plan. Opened Edit Jamie internet, clicked its
actual Show date picker, pressed ArrowRight and Enter to selectSeptember21
(previouslySeptember20), then Save upcoming item. Reloaded the page, reopened
Jamie solo payoff, and inspected rendered text: card minimum dueSeptember26 and
bill45.67 dueSeptember21 persisted. No DOM setters, API calls or test-data writes
were used for these edits. Evidence: jamie-keyboard-calendar-reloaded.txt.

The earlier agent-browser fill/grid-click limitation is retained in the prior
entry, but direct keyboard interaction with the actual controls now proves
editable card and bill dates. No product code change was needed. Remaining work:
actual date-trigger OS delivery, current Android banking and final PR acceptance.


## September 11 — align reminder diagnostic with bill date triggers

Changed the existing Send test reminder diagnostic from TIME_INTERVAL to DATE
ten seconds in the future, matching the native OS trigger type used for actual
obligations. Generic text, session ownership, pending/history replacement and
logout cleanup are preserved. Updated the existing regression to require a Date
within the actual before/after scheduling bounds.

`corepack pnpm --filter @worthlane/api exec vitest run --config
vitest.mobile.config.ts`:24 passed. Mobile typecheck and diff check passed.
Native Jamie login loaded the desktop-created1234.56 balance,20spending and
45.67 bill. DATE-trigger delivery is still in progress: password-save prompt
and unreliable Maestro tab/dialog taps prevented reaching Send test reminder.
No scheduling/presentation success is claimed yet. Current Simulator shows
Open in Worthlane confirmation from local profile deep-link navigation; resolving
that prompt is the next interactive action. No phone or production operation.


## September 11 — native DATE-trigger background banner proven

After resolving the local Open in Worthlane prompt with a coordinate double-tap,
Settings opened. Actual Send test reminder reported Test reminder scheduled;
dismissed OK and pressed Home. A fresh simctl screenshot captured Your test
reminder visibly presented over the iOS Home Screen with the generic test copy.
Evidence: native-date-trigger-background-banner.png. Current source65c8b22 uses
a DATE trigger ten seconds ahead; no timing override or diagnostic logging was
inserted. This proves background banner delivery through the same native DATE
trigger type as obligations. Existing adapter regression independently checks
the selected obligation date minus reminder offset at local9am, recurrence
replacement, privacy and session cleanup. We did not wait until a real9am bill
trigger or test a physical phone, and do not claim those additional checks.

Native run: JAVA_HOME set to localJDK21, MAESTRO_CLI_NO_ANALYTICS=1 and
MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true; maestro --device
D7C7C0D2-5966-476B-8234-80B80FCAF7B8 test
.tmp/native-date-reminder-delivery.yaml passed all actions. Screenshot captured
with xcrun simctl io on that same laptop Simulator. CI104/34648733644 for65c8b22
is currently running; previous CI103 is not substituted for this new code.


## September 11 — CI104 green and local Android SDK ready

CI104/34648733644 on65c8b22 completed all three jobs successfully. Native DATE
background banner proof remains in b35fe07. Follow-up OS-history button attempt
did not display a result because its control remained below the viewport; do not
claim that separate action passed. The directly captured background banner is
the delivery evidence.

Installed Google's Apple Silicon command-line tools15859902 with published SHA256
835b62a26162b229b441d1f6d4680383815a270809eb33522c0d480fa5002c4e.
New scripts/setup-android-sdk-macos.sh mirrors the authorized Windows helper,
requires explicit --accept-license, checks archive integrity and installs only
platform-tools, platform36, build-tools36, NDK27.1.12297006 and CMake3.22.1 into
ignored .tmp/android-sdk. Actual install exited0; bash syntax/diff checks passed.
Official source: https://developer.android.com/studio#command-tools .
Removed only regenerable Worthlane iOS Intermediates.noindex directories to
recover about3.2GiB; built app products and test databases were preserved.

Local API lacked PLAID_ANDROID_PACKAGE_NAME; added com.worthlane.mobile to ignored
.env.local. First API probe omitted required mode and correctly returned400;
corrected mode:create request reached Plaid but failed INVALID_FIELD. A direct
Sandbox-only diagnostic confirmed: Android package name must be configured in
the developer dashboard. No tokens/secrets were logged. Requested approval for
exact shared dashboard addition com.worthlane.mobile, since production setting
changes require approval. This is an external setting dependency, not an app
compilation defect or live-banking activation.

Local ARM64 Android debug build started with JDK21, scoped Android SDK and Gradle
cache, Sentry upload disabled, max2workers/Xmx1536m and
-PreactNativeArchitectures=arm64-v8a. API URL uses Android emulator10.0.2.2:3301/api
and Plaid is enabled. Log /tmp/worthlane-android-macos-build.log. Build completion
and emulator lifecycle remain unverified. iOS Simulator shut down to release RAM;
its saved state is retained. No physical-phone operations or spending.


## September 11 — Android runtime and production/store preparation

Android assembleDebug succeeded in36m30s (435 tasks). APK147776732bytes, SHA256
3e1fc29bf408af452f9a1240785b9390891593e3f164c07f91f1d729e65204b7; apksigner verified.
Package com.worthlane.mobile, min26/target36. Official API36 Google APIs arm64
image rev7 checksum matched SHA1 5a99183b6d924da606260e45fd41a3eb8eca6eb7.
WorthlaneLaptop emulator5554 boot_completed=1; APK installed, Metro8083 bundled
2079modules. Actual login screen renders. First Jamie sign-in returned Invalid
credentials; no saved Android journey success is claimed yet.

To fit the emulator, removed regenerable worktree build caches, stopped disposable
PostgreSQL test clusters after verifying shut-down state, downloaded archives after
extraction, and the local NDK/Gradle cache after build completion. Preserved active
postgres-rGeeqxRH, source, native apps/dSYMs, APK and simulator state. Reinstall
NDK before another native Android build. No physical phone work.

Tyler authorized starting Plaid production and store preparation, explicitly no
store submission. Spending remains gated. This authorizes necessary production
Plaid setup/package registration; current obstacle is browser access, not repeated
permission. Embedded Plaid is signed in per Tyler; automation Chrome remains at
sign-in. No production credentials, live Item or billing change was made.

Verified existing Apple record6766112205 under Tyler Andrew Medina. Replaced old
loss-aversion promotional text/description with couples-first copy; saved and
reloaded, exact promo and description prefix persisted. Manual release remains
selected and status remains Prepare for Submission. Review notes did not persist
after two save/reload attempts; old manual-only notes remain. New review notes and
candidate keywords are retained in docs/store-listing-draft.md, not claimed saved.
Native DOM value setters/input/change events were needed after browser fill was
a no-op; successful fields were verified by reload, not by tool success messages.

Hardened preview/production mobile API configuration to reject HTTP, malformed
addresses, local/emulator IPs, credentials, queries and fragments. Development
routing remains available. node --test scripts/test-mobile-release-config.mjs:
3 passed; git diff --check passed; CI now includes the configuration tests.
New CI is not yet claimed green. Production-preparation.md records remaining
dashboard, signing, hosted-service, privacy and deletion/revocation work.


## September 11 — Android saved solo readbacks and Plaid access verified

The existing synthetic Jamie credentials returned200 from local auth/login.
Cleared/re-entered the Android password through adb input, then sign-in succeeded.
No app/auth code change was needed. Native dashboard shows1234.56net worth,20net
spending and Jamie internet45.67 due in10days. Actual Activity shows expense23.47
and refund3.47. Upcoming shows monthly bill due2026-09-21. Opened Goals by native
deep link, tapped Plan debt payoff then Open Jamie solo payoff: budget50, Avalanche,
current100/minimum10/APR0/statement90/confirmed due2026-09-26. Captured UI XML
readbacks and rendered dashboard PNG in evidence/2026-09-11/android-jamie-*.
This proves saved solo readbacks, not full Android create/edit/banking lifecycle.

Separate automation Chrome now has signed-in Plaid Vantage access. Launch Center
states approved for Production and approved to test with real data. Product-specific
entitlements, plan and billing remain unverified. Developers/API had no Android
package names. Prepared exact com.worthlane.mobile and clicked Save changes under
Tyler's production-setup authorization. Plaid requires Verify your password before
saving; requested the user complete that identity check. Registration is NOT yet
claimed persisted. Do not request redundant setup approval. No paid plan/live Item
or production credential activation; no store submission.


## September 11 — account deletion retains revocation retry state

DELETE /auth/account previously continued local deletion after any Plaid failure,
losing the encrypted token needed to revoke provider access later. It now returns
503 ACCOUNT_DELETION_RETRY_REQUIRED on failure, preserves local user/data/tokens,
and explains that some connections may already be disconnected. A retry accepts
ITEM_NOT_FOUND, matching the existing unlink route. Logs contain a generic error
instead of provider request objects that may contain tokens. No schema change.

Focused vitest command: corepack pnpm --filter @worthlane/api exec vitest run
src/app/api/auth/account/__tests__/route.test.ts
src/lib/__tests__/account-deletion.test.ts —7 passed. Coverage includes auth,
owner scoping, successful ordering, partial failure followed by idempotent retry,
decryption failure and manual-only deletion. API typecheck and diff check passed.
Persistent local HTTP proof: newly registered synthetic manual-only user201,
DELETE200 with deleted:true, subsequent login401; no retained test credentials.
No production account was touched. Hosted/live revocation remains unverified.
Plaid package-save dialog is still awaiting the user's password verification.


## September 14 — Android registration, reminder delivery and CI107

Recovered interrupted September11 work: real Android notification shade displayed
Your test reminder with generic no-payment-due copy after Settings > Send test
reminder > scheduled confirmation > Home. Saved XML and screenshot, visually
inspected, under evidence/2026-09-11/android-reminder-delivery.*. This proves native
DATE-trigger background delivery, not a real9am bill trigger or physical phone.
The rendered Android notification icon appears as a square; check final release
notification artwork before store preparation is complete.

Plaid dashboard reported Android package names saved after Tyler's password check.
The interrupted token probe returned200. A fresh September14 local authenticated
Android create-mode request returned200 with a Sandbox Link token (withheld).
Previous INVALID_FIELD registration error is resolved; no further password/setup
approval is needed for this addition. Production tier/products/billing still need
separate verification; no live bank Item or paid plan was activated.

CI107/34654449068 on0ad40857c2eb21a85082ec676fb6481e5b550b9e completed all3jobs
successfully, including PostgreSQL integrations, regression builds and Windows.

Actual Android Connect bank opened Plaid, Continue without phone number reached
institution search, and First Platypus Bank OAuth launched the external bank page.
Configured emulator Chrome without an account, declined notifications. Synthetic
user_good/pass_good and1234 reached bank consent. An initial selection check used
Back and returned to login; repeated login/MFA and bank consent returned to native
Plaid, but it remains at67percent Continue to log in rather than account confirmation.
No Android OAuth connection success/imports claimed. Account selection did not
appear in the bank confirmation summary; this interaction needs investigation.
No app changes made for this attempt. evidence/2026-09-14/android-oauth-return-pending.xml
records the returned native state. Continue this remaining lifecycle check.


## September 14 — OAuth return diagnostic narrowed

Compared official Plaid Android/OAuth requirements with the built debug manifest
and API: exact package registration/request is present; merged manifest includes
com.plaid.internal.redirect.LinkRedirectActivity for plaid://redirect and
plaid://resume. No configuration mismatch found by this inspection.

Connected agent-browser to the emulator Chrome through an adb localhost9224
forward. Initially CDP timed out while Chrome was backgrounded; foregrounding the
existing OAuth page made it available. Repeated synthetic OAuth login/MFA and
inspected the rendered form. Browser checkbox snapshots/DOM property values were
inconsistent with selected classes/checked attributes and button enablement; the
bank confirmation still omitted selected account text. Do not infer correct account
selection from a successful check command. Native Chrome's breached-password
advisory for the public Sandbox test password also obscured the page and was
dismissed. No real credentials were used or saved.

Targeted the actual visible terms control by its observed id terms (a generic
first-checkbox query had instead found hidden controls from previous steps).
Clicked the enabled Connect account information button. Chrome displayed Continue
to Worthlane?; accepted that actual native prompt. The app opened to a blank
white native surface, not account confirmation. Screenshot saved as
android-oauth-after-browser-confirmation.png. Bounded error-only AndroidRuntime,
chromium and ReactNativeJS log read returned no errors. No successful connection
or imports claimed, and no app code changed. Next isolate a fresh non-OAuth
Sandbox flow and inspect current native Link events/return handling; retain OAuth
as an acceptance requirement.

Sources: https://plaid.com/docs/link/oauth/ and
https://plaid.com/docs/link/android/troubleshooting/ .

## September 14 — Android standard Sandbox Link and repeat sync pass

Verified previous OAuth diagnostic commit cff736c is pushed and linked Plaid task
contains the diagnostic milestone. Restarted only the stuck emulator app (no phone
access or data clearing). Fresh Link initially appeared blank in native inspection
but subsequently rendered normally. Forwarded the debug app WebView CDP and used
its actual rendered controls for Continue without phone, First Platypus Bank
(non-OAuth), public Sandbox user_good/pass_good, 14 checked accounts, Continue,
and Finish without saving a Plaid account. No real bank credentials used.

Native Worthlane displayed Bank connected / linked and synced successfully.
Independent PostgreSQL readback for synthetic Jamie: one HEALTHY First Platypus
Bank Item, needsRelink false, lastSyncAt present; 14 PLAID accounts plus original
MANUAL account; 394 imported transactions with 394 distinct provider IDs and both
original manual entries preserved. Tapped native Sync every institution; observed
Syncing then completion, Healthy status and available history loaded. Repeat SQL
readback remains 394 distinct imported transactions and 2 manual entries.

Evidence: android-standard-link-success.png/.xml and
android-standard-link-resync.xml in evidence/2026-09-14. This proves Android
standard Link callback, exchange, initial import and repeat sync on local Sandbox.
It does not close Android OAuth return, repair/unlink, full two-user native
acceptance, or production/store gates. No application code changed this milestone.
Next retry OAuth with debug WebView inspection after browser handoff; the prior
blank capture alone did not establish a persistent renderer failure.

## September 14 — Android OAuth connect and persisted import pass

Repeated actual Android OAuth Link from Connect bank with First Platypus Bank -
OAuth. Used public synthetic user_good/pass_good and1234 only. Inspected the
rendered Sandbox consent checkbox label: direct checkbox targeting previously
left its checked property false despite selected class. Clicking the actual
visible selection-text child of the Plaid Checking label produced checked=true.
Clicked the visible terms label, verified checked=true and enabled consent.
The bank confirmation's Cash accounts text still omitted names, so it alone was
not used as proof. Native Link then returned to Your accounts with exactly Plaid
Checking selected and disabled (confirmed by its rendered WebView accessibility
tree). Continued and chose Finish without saving a separate Plaid account.

Actual Worthlane Bank connected alert captured in android-oauth-success.png/xml.
Independent PostgreSQL readback: HEALTHY OAuth Item, needsRelink false, lastSyncAt
present, one account and149 imported transactions with149 unique provider IDs.
Standard Item remains HEALTHY with14 accounts/394 unique imports. Original manual
account and2 manual entries remain. No app code fix was necessary; fresh WebView
inspection after handoff resolved the earlier ambiguous blank captures. This is
Sandbox OAuth connection/import proof, not live banking, repair or unlink proof.

Updated acceptance index to remove resolved password/Android connection gates.
Next complete Android forced-error repair and unlink with identity-preservation
readbacks, then finish the remaining two-user native coverage audit.

## September 14 — Android expired-connection repair and unlink verified

Reset only Jamie's standard First Platypus Sandbox Item using the provider's
Sandbox reset-login endpoint (token asserted Sandbox, kept out of output).
Captured baseline account/transaction IDs in ignored local diagnostic JSON.
Actual Sync every institution failed with re-link guidance; native card showed
Needs relink, incomplete-spending notice and retained balances.

Found repair controls below all14 bank accounts. Moved the existing action row
immediately after connection status/error and before account rows. No banking
behavior changed. Mobile typecheck and diff check pass. Emulator screenshot
confirms visible Relink beside status; actual tap launches update-mode Link.
Reauthenticated with public Sandbox password, confirmed accounts and finished
without a separate Plaid account. Native Connection repaired alert captured.
Independent DB comparison proves all16 account IDs and545 transaction IDs were
unchanged and both Items HEALTHY, needsRelink false.

Tapped native Unlink on standard institution and confirmed institution-specific
removal. Diagnostic retained that Sandbox provider token only in process memory
until local deletion, then itemGet returned ITEM_NOT_FOUND: provider access is
revoked. Exact surviving IDs match the pre-repair baseline for OAuth account and
manual account (2), and all149 OAuth imports plus2 manual transactions (151).
The remaining OAuth Item is HEALTHY. Native screen confirms only OAuth institution
and Jamie wallet remain. Evidence android-recovery-actions, android-repaired and
android-unlinked PNG/XML files. No production changes or phone access.

Android standard connect/sync/forced-error repair/unlink and OAuth connect now have
interactive persisted evidence. Final native two-user coverage audit, current CI
and release/store preparation remain; do not infer full beta completion.

## September 14 — fresh Android two-login custom split and privacy readback

CI112/34867048364 on b85d3da completed all3jobs successfully (ci,
postgres-integration, native-windows), including unit/API/contracts, native privacy
and reminder checks, persisted household tests and regression builds.

Signed Jamie out through native confirmation; observed cleared login screen.
Signed Morgan in with separate synthetic credentials. Own net worth -75,829.59;
household viewer total -75,729.59, including only permitted partner data.
Opened existing Groceries600.01 equal agreement in native editor. Selected
Custom %, entered60/50 and saved: rejected with shares must total100% message.
Corrected Avery to40 and saved. Morgan's native plan showed360.01/240 responsibility,
33.80/22.53 applied,326.21/217.47 remaining; historical-effect notice was visible
in editor. No payer or account-visibility edits were made.

Signed Morgan out; signed Avery in with independent credentials. Avery's own
net worth210 and own2 upcoming items appeared. Household viewer total1544.56.
Same saved60/40 plan and exact cent-rounded applied/remaining amounts loaded.
Expanded Accounts & privacy: only4 detailed accounts — Morgan shared wallet
1234.56, two explicitly shared100 test copies, and Avery's own private110
Plaid checking. Morgan's14 private bank accounts and Jamie's data did not appear.
Morgan's screen had17 detailed accounts; this intentional difference follows
privacy, not a missing household balance.

Independent PostgreSQL read confirms Groceries600.01 PERCENTAGE, Morgan6000/Avery4000
basis points, with2 historical agreement versions retained. Synthetic agreement
left at60/40 for further checks. Evidence android-custom-saved, android-avery-split,
android-avery-privacy PNG/XML plus fresh-login and invalid-split XML. No new code
this milestone. Re-read current Notion acceptance criteria. Final integrated
evidence audit and production/store preparation remain; no submission.

## September 14 — fix opaque Android notification resources

Fresh Plaid in-app inspection remains Welcome back; provider session work is
still awaiting user sign-in. Continued independent local release artwork work.
Found exact cause of the square notification mark: source notification-icon.png
has white artwork and transparency, but all five checked-in Android density
resources were opaque. Regenerated them using Expo notifications plugin's
setNotificationIconAsync from the existing source (no new logo design). Updated
scripts/generate-mobile-brand.mjs to regenerate checked-in native notification
resources whenever Android is present, preventing source/native drift.

Verified24/36/48/72/96px sizes, RGBA, white visible pixels and majority-transparent
backgrounds for all five densities. Inspected generated mark visually. Generator
syntax, Expo import and git diff check pass. This fixes source resources; a new
APK and delivered OS banner still require verification, and are not claimed.
Existing installed debug APK still contains the old artwork. No production change,
store submission, phone access or spending.

## September 14 — provider access restored; actual rates and store-save blocker

Mac native inventory now available; separate in-app Plaid and Apple tabs signed
in. Vantage Products marks Transactions and Balance Enabled; Liabilities not
enabled. Selected Liabilities to inspect UI, then cleared selection without
Add products. Plans identifies Pay As You Go/current/no monthly minimum. Billing
active rates: Transactions0.30USD per Item/month; Balance0.10USD per call.
No paid request, plan change, payment edit, production key activation or new
product permission. These rates are live dashboard evidence, not inferred docs.

Apple existing record remains Prepare for Submission/manual release. Existing
couples promo/description retained. Prepared corrected review notes and keywords;
Save exposed four missing review-contact fields (first/last name,email,phone).
Requested user-designated contact for these private Apple fields or direct entry.
New notes/keywords persistence remains unproven; no reviewer credentials invented
and no submission. Updated preparation docs to remove expired-session blockers
and record exact rates/contact dependency.

### September 14 — Apple review draft save resolved

Tyler supplied private review contact details and explicitly authorized entering
them in App Store Connect. Filled required contact fields, saved and reloaded.
Corrected PREPARATION DRAFT notes and couples keywords persisted. Save disabled;
Prepare for Submission/manual release retained. Phone/email values were omitted
by text snapshots/read-only DOM probes, so inspected the actual screenshot after
reload, which displayed the authorized values. No further mutation was needed.
No contact values copied to repo/Notion, no reviewer credentials fabricated, and
no Add for Review or submission. Store contact/save blocker resolved.

### September 14 — existing hosting located and institution gates inspected

Vercel worthlane is rooted at apps/web. worthlane-desktop production is Ready on
main10cd6fa (PR14); beta-acceptance preview is Ready. Desktop has WORTHLANE_API_URL
and WORTHLANE_DESKTOP_PROXY_SECRET configured for Production and Preview; secret
values were not revealed. Railway existing GitHub sign-in succeeded. Worthlane
project a2386fda-ce79-4de5-b8c5-aef7ec8e8e3e contains online API and PostgreSQL.
API service f0d862bc-2bce-4ac1-b507-2639d3eb0cb4 exposes
https://financeapi-production-1853.up.railway.app and active deployment
dbd7cf1f-7794-4ddd-88c1-3ae5c76451f2 is the PR13 foundation; PR14 was skipped
for unchanged watched files. Dashboard status is hosting evidence, not a current
candidate deployment or end-to-end production acceptance. No deployment, database
read/write, migration, environment edit or plan purchase was performed.

Plaid institution view: Capital One requires legal entity name; PNC and Navy
Federal disabled for inactivity; Schwab/Fidelity access available on request.
User confirmed personal operation and exact legal name. Entered authorized name
in existing company profile; Save triggered password verification, so persistence
is pending the user's authentication. No LLC claimed and no institution-access
request submitted. Continue API configuration/signing/assets preparation.

User completed Plaid password verification. Legal entity name persisted after
reload with Save disabled. Capital One changed from missing legal entity name
to In review. This is provider review pending, not enabled institution access.

### September 14 — deployment readiness preparation

Railway loaded settings confirm main autodeploy, Wait for CI off, only /apps/api/**
watched, and no healthcheck. The initial loading state briefly displayed an
invalid-region warning; it disappeared after region data loaded, so no region
blocker or change is claimed. Existing Nixpacks/config-as-code setup is marked
deprecated by Railway and needs a separate migration review before its cutoff.

Prepared /api/health: dynamic, uncached SELECT 1 readiness, generic503 on database
failure, no user data or Plaid calls. railway.json adds shared packages and root
build inputs to watchPatterns plus /api/health with120-second deploy timeout.
Existing deployment/migration commands retained; no production setting changed.
Two focused failure/recovery tests and API typecheck pass. Actual local API3301
returned200 and Cache-Control:no-store against persistent Sandbox PostgreSQL.
Isolated API production build passed with synthetic build environment values;
initial attempt compiled but failed page collection because required DB/JWT env
was absent. Removed generated local build-directory entry from tsconfig.
Commands: corepack pnpm --filter @worthlane/api exec vitest run
src/app/api/health/__tests__/route.test.ts; corepack pnpm --filter @worthlane/api
typecheck; curl --include http://127.0.0.1:3301/api/health; build with
WORTHLANE_HTTP_DIST_DIR=.next-http-3399 and local synthetic DATABASE_URL/JWT values.

User-authorized Plaid company name/address update persisted in a fresh tab.
App profile website/description correction prepared; Save requires a logo.
Existing1024px app icon inspected, file chooser automation timed out twice;
native Codex control is blocked, so user logo selection requested. Do not claim
app-profile save or clearance yet. No private contact/address copied into docs.

### September 14 — signing and Play account gates

Read local signing identity metadata and Android Gradle signing configuration.
Only personal Apple Development identities are installed; no personal distribution
identity verified. Android release still points to debug signing. No unrelated
organization certificate used. Play Console personal account reaches signup;
Workspace account access disabled. No account creation, payment or terms accepted.
Updated store draft to distinguish saved Apple review contact from missing reviewer
login and record concrete signing/account prerequisites.

CI120/34871435179 on deaea70: PostgreSQL integration completed successfully; Linux
typecheck/API/shared/contract/reminder/auth/release-config tests passed, mobile
bundle/builds and Windows job still running at inspection. No all-green claim yet.

### September 14 — hosted Plaid mode and missing platform settings

Railway service has13 variables. Revealed only non-secret PLAID_ENV and legacy
PLAID_REDIRECT_URI: environment already production; redirect uses old Railway
OAuth-return path. IOS_REDIRECT_URI, ANDROID_PACKAGE_NAME, WEB_REDIRECT_URI and
WEBHOOK_URL absent. Current code requires platform-specific names, so existing
credentials alone do not establish working native Link. Prepared exact public
settings/validation table in production-preparation.md. No secret values, provider
calls, environment mutations or redeployment. Compared candidate migration files
to active PR13 commit: one additive HouseholdAccountMatch migration; hosted
migration/backup status remains unverified.

### September 14 — app profile persisted and remaining security warning located

Fresh Plaid App profile confirms saved name/website/data purpose/icon; disabled
Save and no tab action count. User's logo/profile action resolved prior picker
blocker. Overall warning originates from Data security with17 required
attestations dueSeptember9; exact categories recorded in production-preparation.
Questionnaire March8 completion is historical, not proof remediation is complete.
No security attestation submitted; controls need evidence review, including
consumer/internal MFA and policies.

### September 14 — truthful privacy attestation and Next.js security patch

User authorized attestations only when true. Verified live public /privacy page
in browser (September10 content), read exact Plaid statement, submitted only
"has published a privacy policy", and verified Attested. Zero-trust already showed
Attested when inspected; this agent did not submit or verify that separate claim.
Consumer MFA and other organization-wide controls remain unverified.

Ran corepack pnpm audit --prod --json: baseline metadata reported6 critical,100
high,80 moderate,12 low across1177 dependencies, including28 Next advisories.
These counts are registry findings, not verified exploitable paths. Followed
official Next15 guide and next-async-request-api codemod; updated19 API route
handlers and test callers to async params, moved serverExternalPackages config,
and upgraded API/desktop/web to Next15.5.25 and React19.1.9. No mobile RN upgrade.
Rescan reports zero Next advisories; remaining2 critical,81 high,60 moderate,8 low
need triage/remediation. Critical remainder is mobile tooling shell-quote and tar.
Sources: https://github.com/advisories/GHSA-2xp9-vwfh-vxw4 and
https://github.com/advisories/GHSA-p293-qw3h-jr36.

Validation: all3 app typechecks pass;163 API tests pass; API/desktop/web production
builds pass with synthetic environment and isolated .next-http-3399 outputs.
WORTHLANE_TEST_PORT=55449 bash scripts/test-postgres.sh passes10 PostgreSQL tests
after fresh migration and stops its own cluster. An initial run on retained
Sandbox passed9/10 but correctly rejected the fresh-bootstrap test's zero-user
assumption (32 existing synthetic users); retained data was not reset. Fresh
cluster .tmp/postgres-dqIhAPO7 retained stopped. Generated build path edits to
tsconfig/next-env reverted; actual builds validated new generated route types.
Interactive post-upgrade checks and CI remain next. No production deployment.

### September 14 — patched production-build interactive acceptance

Started actual Next15.5.25 production builds on API3399/desktop3398 against
persistent local Sandbox DB55439 with retained local auth/encryption secrets.
Fresh Morgan login: visible net worth-75729.59;600.01 budget at60/40. Changed
Groceries to600.03 via UI:360.02/240.01,56.33 applied,543.70 remaining. Reload
retained it. Restored600.01 via UI:360.01/240,543.68 remaining; agreement history
shows both versions. Dynamic parameter mutation/readback routes work over HTTP.
Morgan private saved100 balance/10 minimum/50 budget/0APR Snowball plan loads
with October payoff and zero interest; Internet bill45.67 dueOctober20 retained.

Fresh Avery login retains1544.56 permitted net worth and only4 permitted account
rows; restored shared600.01 allocation visible. Debt workspace shows only Avery
native payoff, own10 minimum dueSeptember25 and87.65 internet dueOctober20,
without Morgan's private plan/bill.

Fresh Jamie solo login retains1344.56 visible net worth, owned600.01 budget and
36.33 applied/563.68 remaining. Saved private debt loads100current/90statement/
10minimum/50budget/0APR, September26 due date, October payoff and0interest.
Internet45.67 dueSeptember21 retained. Browser error log contains0 errors.
These are post-upgrade interactive checks against existing synthetic data, not
production-bank use or fresh onboarding. Existing fresh PostgreSQL suite covers
registration/consent and financial invariants. CI124/34872702609 on ea0aea7 has
PostgreSQL, Windows and Linux jobs successful (all three verified complete).

### September 14 — critical transitive dependency patches

Pinned vulnerable shell-quote versions to1.8.4 and tar7 versions to7.5.19 through
scoped pnpm overrides. These patch React Native/Expo tooling and shared desktop
packaging dependencies without changing the native framework version. Install
succeeded and Expo export --platform all completed for iOS, Android and web.

Fresh production-dependency audit reports0 critical,80 high,57 moderate and8 low
findings, versus2 critical before this change. These are registry dependency
findings, not confirmed runtime exploits. High/moderate findings still require
triage; zero critical does not certify production security. Local raw evidence:
.tmp/production-dependency-audit-after-tooling.json and
.tmp/security-tooling-export.log. CI for this patch remains pending at commit.

Plaid still shows15 outstanding controls, privacy Attested, and zero trust
previously Attested by another action. Its scanning drawer explicitly covers
employee/contractor machines and production assets. Repository dependency scans
alone do not establish that coverage; no further attestation was submitted.
Next: verify organizational controls and remediate unsupported claims, triage
remaining dependency findings, and finish reviewed hosting/signing preparation.
No production deploy, live banking request, paid service or store submission.

### September 14 — banking and notification HTTP client security patches

Scoped same-major overrides now resolve Axios1.20.0, form-data4.0.6,
Undici6.28.0 and7.29.1. Plaid uses Axios; Expo push uses Undici7, while mobile
tooling retains Undici6. Node engine requirements remain unchanged by these
Undici updates. Reviewed upstream release/advisory evidence:
[Axios release](https://github.com/axios/axios/releases/tag/v1.20.0),
[Undici release](https://github.com/nodejs/undici/releases/tag/v7.29.1), and
[form-data advisory](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx).

Install, API typecheck and all163 API tests pass. Real provider Sandbox test
passes against local PostgreSQL55439: encrypted Item persistence, owner isolation,
Liabilities statement/minimum/due fields, repeated sync without duplicates,
ITEM_LOGIN_REQUIRED and update tokens, and unlink cleanup. The test created its
own synthetic users and revoked its own Sandbox Item; existing acceptance users
were preserved. No production or live-bank request was made. This checks API
integration after the dependency update, not another native Link UI session or
actual push delivery.

Fresh production audit:0 critical,60 high,24 moderate,3 low. No findings remain
for Axios, Undici or form-data. Remaining dependencies still require triage;
no organization-wide security attestation follows from this result. Evidence:
.tmp/http-client-security-{install,tests,typecheck,plaid}.log and
.tmp/production-dependency-audit-after-http.json. CI126 on prior62298b7 was still
running (PostgreSQL successful) at inspection; this new patch needs its own CI.

### September 14 — web OAuth return gap repaired locally

Audit found the prepared /accounts redirect did not exist and web Link had no
receivedRedirectUri resume path. Added /dashboard/plaid-return with a focused
Worthlane recovery screen. It resumes the original short-lived Link token from
versioned, tab-scoped sessionStorage, preserving create/update and debt-consent
intent; it never creates a replacement token for an OAuth return. Pending state
expires after30 minutes and clears on completion, cancellation or failure.

The BFF issues an HttpOnly, Secure, SameSite=Lax nonce cookie after authenticated
Link-token creation. The nonce is bound to a stable account-subject fingerprint;
this is an additional login-boundary check, not JWT authentication. Upstream
JWT verification remains mandatory for actual banking operations. Successful
login/registration and logout clear the cookie. Resume and final exchange/update
reject previous-login boundaries, including overlapping response/account-switch
cases. Normal token refresh keeps the account binding. No bank credentials or
Plaid access token are stored in browser storage.

Validation:12 web lifecycle/server guard tests pass; desktop typecheck passes.
Actual local HTTP on3402 against Sandbox API3399 verifies same-session resume,
cross-origin rejection, Morgan-to-Avery login switch denial for resume/exchange/
sync, and logout denial. It requested only a Sandbox Link token; no Item was
created or exchanged. Laptop browser rendered the expired-session explanation,
retry and Return to Accounts link; styled screen visually inspected. Logs:
.tmp/web-oauth-{tests,typecheck,http}.log. Updated the existing HTTP fixture to
send the BFF-issued session identifier during its optional Sandbox exchange.

Production plan now uses
https://worthlane-desktop.vercel.app/dashboard/plaid-return. No hosted variable,
allowlist, API deployment or store submission changed. Real provider browser
OAuth return on the new route, production build/CI and release configuration
remain pending. Current provider guidance:
https://plaid.com/docs/link/oauth/#reinitializing-link . Prior desktop Sandbox
popup/OAuth evidence does not prove this newly implemented redirect path.

### September 14 — API diagnostics privacy boundary

Review for store privacy found sendDefaultPii=true in both API Sentry runtimes.
Changed both to false and added an allowlisted beforeSend reconstruction that
removes request data/cookies/URLs, user context, breadcrumbs, tags/extras, raw
exception messages and stack locals/source excerpts. Only generic error text,
release/environment and recognized application source positions remain. Request
tracing is disabled and transaction events are dropped. This intentionally
reduces diagnostic detail; it is not an assertion about provider-side retention
or previously collected data. Mobile diagnostics require a separate review.

All166 API tests and typecheck pass, including synthetic credential/financial
payload removal and tests of both actual Sentry initialization configurations.
Evidence .tmp/diagnostic-privacy-{tests,typecheck}.log. No hosted settings or
production deployment changed. CI128/34875005130 on prior0cfe53e completed all
three jobs successfully (Linux builds/tests, PostgreSQL, Windows packaging).

User approved the exact localhost Plaid return addition and completed password
verification. Dashboard explicitly confirmed "The redirect URIs have been saved".
Configured only the new local Sandbox API3401 to request
http://localhost:3402/dashboard/plaid-return. Existing production URLs preserved;
no live bank call, paid service or store submission. Actual browser return check
is in progress from Jamie's local Sandbox account.

### September 14 — isolate the local OAuth verification runtime

Found the ad-hoc .next-oauth-3402 setting did not match next.config's supported
.next-http-N format, so it silently used the default build directory. Updated
scripts/dev-sandbox.mjs to accept validated, distinct unprivileged API/desktop
ports and assign supported separate .next-http-PORT build directories. Port
preflight now checks each service's actual loopback hostname (including localhost
IPv6). Default ports remain3301/3303; retained Sandbox DB and secrets are unchanged.

Stopped only this task's3401/3402 servers, then launched the script with3401/3402,
the approved web redirect and existing local DB55439. Verified both listeners,
both separate build directories and Jamie's persisted manual/bank account UI.
Syntax check passes. Generated Next tsconfig/next-env edits were restored.
Runtime session5630; local log .tmp/oauth-isolated-runtime.log. Production unchanged.

Plaid frame URL points to the documented cdn.plaid.com origin. Browser error log
contained no CSP error; this does not prove child-frame networking succeeded.
Network errors captured during the server restart are not provider failures.
Actual browser redirect acceptance remains open pending the instrumented check.

### September 14 — mobile diagnostic privacy and store disclosure evidence

Added a strict JavaScript error-event reconstruction for mobile: removes raw
messages, user/request/navigation/network context, breadcrumbs, extras and frame
locals; retains generic errors and recognized bundle source positions. Disabled
traces/transaction events, screenshots and view hierarchy. Native crash events
bypass the JS beforeSend filter, so the candidate disables the native SDK and
automatic session tracking pending native-filter review. Explicit app release
label replaces automatic native release detection. This sacrifices native crash
detail; it does not claim source-map/native symbolication acceptance.

Three new tests execute the actual sanitizer/configuration with enabled/disabled
and malformed optional configuration; added them to CI. All16 existing auth/session
privacy tests, mobile typecheck, and Expo exports for iOS/Android/web pass. Logs:
.tmp/mobile-diagnostic-{tests,auth,typecheck,export}.log. New exports use
.tmp/mobile-diagnostic-export. No native device installation or Sentry transmission
was used for these checks. Native launch acceptance for this SDK-mode change
remains required before release.

Expanded docs/store-listing-draft.md with source-backed collection/purpose rows:
email/user IDs, household/invitation data, financial/purchase information, push
tokens, optional linked analytics and filtered diagnostics. Final answers depend
on the selected artifact and enabled services; no privacy form was published.
No production deploy, spending, live-bank call or store submission.

### September 14 — native Chrome Sandbox OAuth and replay verified

Simulator app control timed out through name, bundle and explicit installed path;
no physical phone was used. Although the Chrome browser-tab provider is unavailable,
CUA native app control for com.google.Chrome works. Used that supported surface
without changing browser security settings. Fresh Jamie synthetic login on3402
loaded persisted1344.56 net worth and two accounts.

Chrome opened actual Plaid Link successfully. Chose First Platypus Bank - OAuth,
completed its synthetic credentials/verification and selected only Plaid Saving.
Skipped phone/consumer-Plaid-account creation and declined Chrome password saving.
OAuth used Plaid's desktop popup return to cdn.plaid.com, then account confirmation
and Finish without saving. Worthlane displayed Connection saved; new account is
Personal, balance210.00, visible net worth1554.56 and3 accounts/2 institutions.

Repeat sync completed in the UI. Database readback before/after shows identical
account and transaction ID hashes,3 accounts and201 transactions. Reload retains
1554.56, the savings account and Personal visibility. Existing manual/checking
accounts remain. Snapshot evidence .tmp/chrome-oauth-{before,after}-sync.json;
only aggregate counts/hashes retained there. This verifies the updated BFF nonce
exchange on a real provider popup flow, not /dashboard/plaid-return reinitialization.
Full-page/mobile-web redirect remains a distinct open check. No live bank or paid
operation occurred. Synthetic connected Item retained for continued acceptance.

CI131/34876625261 on58fa386 completed all three jobs successfully. Native launch
for the revised mobile diagnostic mode remains unverified due Simulator control.

### September 14 — mobile-web cancellation and bank-layout correction

Chrome iPhone12Pro emulation at390px still opened a separate OAuth popup, so it
cannot stand in for full-page redirect acceptance. Closed that popup before
entering credentials and used Plaid Exit/Yes exit. Worthlane returned to Connect
bank with calm cancellation feedback. Independent PostgreSQL readback retained
the same3 account IDs and201 transaction IDs as chrome-oauth-after-sync.json.

The emulated view exposed squeezed institution/status text beside fixed bank
actions. Connection rows now wrap, reserve readable text width, and wrap actions
within the card. A fresh screenshot confirms readable institution, Healthy status,
freshness notice, last retrieval and all three actions at390px. This is CSS only;
no financial or banking behavior changed. Desktop restoration was attempted via
Chrome shortcuts; native app control then returned a profile-menu/empty-window
state, so desktop visual verification and restoration are not claimed.

Reconciled the acceptance index's stale Apple/Plaid preparation paragraph with
recorded dashboard evidence and corrected AGENTS.md's obsolete Next14 reference.
Full-page web OAuth and fresh native diagnostics launch remain open. No provider
settings, production deployment, paid call, store submission or phone use.

### September 14 — redirect test configuration clarified

Plaid's current OAuth guide explicitly says desktop and ordinary mobile web use
popups; its supported redirect test uses a Chrome custom device with a WebView
user agent: https://plaid.com/docs/link/oauth/#testing-oauth. Created temporary
Worthlane Sandbox WebView profile using that documented user agent,400x700.
The attempted flow still displayed the provider CDN popup return address. This
does not prove the override was applied to the loaded page: native keyboard and
clipboard operations subsequently timed out or failed to navigate. No synthetic
bank credentials were entered on this attempt, and no exchange was completed.
Next test must verify the effective browser user agent and reload through a
confirmed UI action before opening Link; do not repeat ordinary iPhone emulation.

Recovered the local Accounts page through the visible address suggestion.
Fresh screenshot confirms ordinary desktop layout with DevTools closed and
emulation off; Jamie retains1554.56 and3 accounts. PostgreSQL still has identical
3 account IDs and201 transaction IDs. All12 OAuth lifecycle tests pass, which
remains component/proxy evidence rather than provider redirect acceptance.
Simulator control again timed out; no simulator is booted. Native launch remains
open. No production or store action performed.

### September 14 — verified WebView OAuth paused by laptop lock

Reloaded via Chrome's actual Reload button with Worthlane Sandbox WebView active.
Read navigator.userAgent in DevTools: it exactly matches Plaid's documented
Android WebView user agent. Actual OAuth replaces the originating page in the
same Chrome tab. The intermediate sandbox-oauth-login.html URL still contains
Plaid's CDN oauth.html redirect; that URL alone was insufficient to classify
earlier attempts as popup flows. The completed earlier desktop popup evidence
remains separate.

Completed synthetic user_good authentication and1234 simulated verification;
selected only the distinct Plaid CD account and continued to the simulated bank's
final consent screen. Before final consent/return, Computer Use reported that the
Mac is locked and automatic unlock failed. No final consent, exchange, return-page
success, or new persisted account is claimed. Leave this browser flow in place
until Tyler unlocks the laptop; do not restart it solely because observation failed.
No physical phone, production data, paid request or store submission was used.

### September 14 — full-page web OAuth and persisted repeat sync passed

Laptop became accessible; resumed the existing synthetic consent. Bank flow
returned to localhost3402/dashboard/plaid-return with oauth_state_id. The local
30-minute session had expired during the lock; the return page correctly showed
expired/missing-session recovery and did not import an account. Return to Accounts
retained Jamie's1554.56 and3 accounts.

Started a fresh session with the verified WebView profile. Synthetic bank login,
verification and selection of only Plaid CD completed. Same-tab bank navigation
returned through Plaid CDN to the actual Worthlane return route, which reopened
Link at selected-account confirmation. Continue and Finish without saving produced
Connection saved on the return page. Accounts shows Plaid CD1000.00, Personal,
net worth2554.56,4 accounts and3 healthy institutions. No consumer Plaid signup.

Independent PostgreSQL snapshots after exchange and after repeat sync of the new
Item match exactly:4 account IDs,226 transaction IDs; hashes
4ebc02831013d55a3f2efceea531e8f537501923ccbb9e857ec6a7747d15bb37 and
1e68fbb597b6c27ac5c55f33e75d7a2b80a7541418ad29ba9e7b5e69b7273834.
API accounts route orders Items by creation time; selected the last/new Item's
Sync and observed completion. An earlier click also synced the first existing
Item harmlessly. New CD contributes25 transactions; prior accounts remain.
Disabled device emulation via toolbar (Value0), closed DevTools, and reloaded via
actual Reload button.2554.56/CD1000.00/Personal persist. Browser test configuration
now restored to desktop. Temporary custom device profile remains available for
future local tests but is inactive.

CI135/34879714828 on99b0e79 completed all3 jobs successfully. Full-page create
return and expired-session recovery now have actual provider/UI/persistence proof;
update-mode resume retains separate automated coverage. Latest native diagnostic
launch remains open. No production configuration, real bank, paid call or submission.

### September 14 — native launch environment recovered

After authorized storage cleanup, existing iPhone16Pro simulator was still shut
down. Booted existing device D7C7C0D2-5966-476B-8234-80B80FCAF7B8 through Apple's
simctl device-management CLI without erasing data. Bootstatus completed and CUA
screenshots show its home screen. Installed com.worthlane.mobile remains present.

Started fresh Metro8084 with EXPO_NO_DOTENV/EXPO_NO_TELEMETRY, local API3401,
Plaid enabled, Sentry/PostHog keys empty, AI/paywall disabled. Manifest returns200
and no Sentry DSN. Fetched current iOS JavaScript bundle contains the diagnostic
privacy filter, enableNative:false, and127.0.0.1:3401/api. This proves current
served code/configuration, not native launch. Existing8082/8083 services were left
intact; their manifests contain Sentry configuration, so they are not the isolated
target for this check.

CUA can inspect/raise the Simulator window and send its Home keyboard command,
but screen clicks consistently fail with noWindowsAvailable, including after
raising the window. Need the user to open Worthlane in this simulator and select
http://localhost:8084 as its development server before rendered launch acceptance.
Keep this setup live; no app/test data reset, phone interaction, production
configuration change or store submission occurred.

### September 14 — Android release signing fails closed

Simulator remains on Home; CUA touch action still fails. Independent store
preparation found the tracked release build used signingConfigs.debug. Removed
that fallback and added a task-graph guard evaluated after EAS credential
injection. Release packaging rejects absent/incomplete signing, debug signing
configuration/default alias/file and missing keystore files. Debug tests remain
available. No real signing key, credential upload, store build or submission.

Executed the actual Groovy guard through a minimal isolated Gradle project:
debug/no-key passes; release/no-key, debug configuration, default debug alias and
missing-file cases fail with the expected safe error; complete synthetic release
configuration passes. All6 regression cases pass without exposing fixture
passwords. Three existing mobile release-config tests also pass. Added the
reproducible runner to CI with Java21. This tests configuration gating, not a
signed artifact or the Android Gradle plugin build; final upload-certificate and
AAB/APK signature verification remain required. See store-listing-draft.md.

### September 14 — signing guard and candidate CI verified

GitHub CI139/34890340960 on 4f9eb9e completed all three jobs successfully:
ci, postgres-integration and native-windows. The CI job includes the actual
Gradle signing guard fixtures; database tests apply migrations to isolated
PostgreSQL and verify persisted household consent and budgets. Corrected stale
completion-audit rows that still described the now-passed full-page OAuth and
older CI as pending.

Fresh Simulator screenshot still shows Home; attempting its Search control fails
with noWindowsAvailable. Native launch acceptance remains unverified pending
manual opening of Worthlane with local Metro8084 or restored CUA touch control.
No production changes, signing credentials, paid builds or submissions.

### September 14 — browser entry no longer calls native secure storage

User screenshot of localhost8084 exposed an actual Expo web startup failure:
SecureStore.getItemAsync called a native method unavailable in the browser.
Added a platform-specific web root layout that does not mount native auth,
reminders, billing or diagnostic initialization. Native root remains unchanged;
web users are directed to the existing cookie-backed desktop app instead of
introducing browser token storage. Local development links to the isolated
localhost3402 client; nonlocal builds link to the public Worthlane site.

Mobile typecheck passed. CUA browser reload on8084 rendered the forest/cream
entry without the error overlay; actual link click reached3402/login with the
separate-login guidance and email/password fields. This fixes the user's browser
error but does not claim fresh native launch acceptance. No production change.

### September 14 — Simulator relaunched; current native startup verified

At the user's request, quit and relaunched the installed Xcode Simulator app
without erasing its existing iPhone16Pro data. Native accessibility controls
recovered. Used Spotlight to open Worthlane. Dev menu showed the app initially
selected older Metro8082; returned to development home and explicitly selected
localhost8084. Current iOS bundle completed and the native dashboard rendered.
After a slow local API response (dashboard200 in26.7s), persisted Jamie data
appeared: net worth2554.56, spending131.13, received500, internet bill45.67 in7days,
and groceries600.01. This closes fresh native startup for the changed diagnostic
mode with external telemetry disabled in the8084 configuration.

A visible reminder refresh warning remains; investigate/retry separately before
claiming reminder reconciliation on this recovered session. No phone use,
production change, data reset or store submission. CI141 Windows and PostgreSQL
jobs passed; primary CI job was still running at this observation.

### September 14 — native reminder persistence and OS scheduling verified

CI141/34891276651 on81a4fc3 passed all three jobs. Foreground reconciliation
cleared the earlier reminder warning following a slow local API response.
Restarted Simulator once after editor-control failure without resetting data.
After the modal settled, a full AX refresh provided valid controls; selected
One day before for Jamie internet and saved. Native Saved confirmation appeared.
PostgreSQL readback:45.67, due2026-09-21,MONTHLY,ONE_DAY_BEFORE.

Read-only inspection of this simulator's Worthlane pending-notification archive
found one Upcoming payment notification with generic body, scoped obligation/user
metadata and no amount/name in displayed text. RequestDate plus trigger interval
is2026-09-20T16:00:00.252375Z, or09:00 Phoenix one day before due date; nonrepeating.
This establishes native OS scheduling, not actual future delivery. Dismissed
save confirmation and left Upcoming visible. No production change or phone use.

### September 14 — actual-app screenshot drafts captured

Saved native-resolution Upcoming and dashboard PNGs through Simulator Save Screen,
using persisted synthetic Jamie data. Both are1206x2622 with no simulator chrome.
Inspected dashboard capture; no loading/error overlay or real financial data.
Files and capture provenance are in docs/evidence/2026-09-14/store-draft.
Apple's current specification accepts these in6.3-inch slots, but the required
6.9-inch or6.5-inch set remains; couples responsibility/privacy/debt screens and
release-build parity also remain. No stretching, mocked content, upload or submission.

### September 14 — larger-device couple session and first6.9-inch capture

After user-requested restart, ProMax reopened Worthlane with Morgan's session
preserved. Password prompt gone and dashboard loaded. Household native AX shows
Shared with Avery,600.01 Groceries,60/40 responsibilities360.01/240, and spending
33.80/22.53. Current privacy-scoped totals and shared context rendered.

Simulator Save Screen produced03-household-iphone16promax.png at1320x2868.
No mockup, scaling or real data. Overview and privacy explanation visible; full
allocation section is below fold. CUA scroll still fails noWindowsAvailable;
remaining allocation/debt captures and final-build parity are not accepted yet.
No upload, production change or submission.

### September 14 — actionable reminder refresh recovery

Added an accessible Retry device reminder refresh button to transient-error
banners. It reruns the existing session-scoped reconciliation; denied permission
continues to direct users to notification settings. Mobile typecheck and all24
mobile adapter tests pass. Native fault check paused only sandbox API3401 for
35seconds with automatic SIGCONT in finally; hot refresh reproduced15-second
reminder timeout and visible Retry button. After confirmed automatic resume,
clicked Retry; upcoming returned200 and warning cleared. No persisted data reset.

## September 14 — latest candidate CI and release access

GitHub CI146 (34895627772) on a96d74b completed all three jobs successfully:
ci, postgres-integration, and native-windows. Inspected individual steps include
mobile reminder/privacy adapters, financial rules, persisted household consent
and budgets, mobile bundling, all web/API builds, and Windows packaging.
This complements the prior actual native timeout/retry recovery check; it does
not prove a signed store artifact.

Release preparation read-only check: installed EAS CLI returned `Not logged in`
from apps/mobile. Expo CLI authentication is needed before hosted signing
credentials can be inspected; Apple/Plaid browser sessions do not supply it.
No build, upload, submission, paid operation, or production mutation occurred.

## September 14 — budget editor native safe-area correction

Actual iPhone16ProMax inspection found the category editor title drawn beneath
the status bar/Dynamic Island. Added a SafeAreaProvider at the native Modal root
in HouseholdBudgetEditor so its existing SafeAreaView measures that presentation.
This follows the library's modal-root guidance:
https://appandflow.github.io/react-native-safe-area-context/api/safe-area-provider/

Mobile typecheck passes. Actual before/after screen inspection and closing/reopening
the editor confirm the heading and form clear the status bar. The persisted
Groceries600.01 and Morgan60%/Avery40% values remained intact; no save or deletion
was performed. Captured the corrected actual native screen as
docs/evidence/2026-09-14/store-draft/04-custom-budget-iphone16promax.png.

Coordinate drag still fails in the computer-control layer, while semantic button
controls work. No phone interaction, production mutation, store upload or submission.
Expo CLI login and the previously documented release gates remain open.

## September 14 — debt estimate visible before editing inputs

Moved the existing native debt estimate/status above the long editing form so
opening a saved plan immediately exposes its result. Added the selected method,
monthly budget and month-end/lender-calculation caveat alongside the summary.
Warnings, shortfall, first-payment breakdown, expandable monthly schedule and
full detailed assumptions remain. Preview/save returns the scroll position to
the result/status, including validation failures. Finance calculations and API
mutations are unchanged.

Mobile typecheck passed. Actual iPhone16ProMax loaded Morgan's persisted100
balance/zeroAPR/Snowball plan:50monthly, October2026 payoff,0interest,100total.
Expanded schedule displayed September50/remaining50 and October50/remaining0.
Captured unmodified1320x2868 native draft05-debt-payoff-iphone16promax.png.
Adding the scroll ref caused a development Fast Refresh hook-order error; a full
app reload cleared it, then reopening the saved plan and previewing succeeded
with the explicit unsaved-preview status. No plan save, bank call or phone action.
Expo authentication and existing signing/hosted release gates remain open.

## September 14 — CI149 completes for native UI candidate

Verified GitHub run34897135407 for6219a18 and all three job conclusions:
ci, postgres-integration and native-windows succeeded. This includes the modal
safe-area fix and debt-result layout, plus previous persistence/privacy coverage.
The laptop Android debug rebuild remains a separate live process, installing
NDK27.1.12297006 then proceeding through Expo module configuration. No new APK
or notification banner verification is claimed at this checkpoint.

Support verification remains limited: published address is support@worthlane.app
and DNS MX routes to Google. A narrow existing-mail check found a sent message
only, which does not establish delivery or monitored support. No test email sent.

## September 14 — native Mac app requested and delivered locally

Added macOS support to the existing Electron architecture: native app/Edit menus,
Command-R, keep-running-on-window-close and reopen behavior. Mac packaging uses
the same seven archived runtime assets and eight hardened fuses as Windows.
Added explicit local arm64 and guarded distribution commands; public distribution
requires a selected Developer ID identity and notarization. No unrelated signing
identity, paid service or store submission used.

Validation:16 desktop tests and syntax checks pass. Actual arm64.app packaging
completed; archive/fuse verifier passed, and codesign --verify --deep --strict
passed. Actual CUA launch at pinnedlocalhost3402, synthetic Morgan sign-in,
loaded Morgan/Avery household600.01 and60/40 allocations, then window close/reopen
retained authenticated state. This is actual persisted API data, not the public
demo. Local application copied to ~/Applications/Worthlane.app and signature
verified. Final installed-location launch checked separately below.

Android debug rebuild also completed in13m1s,447tasks(58executed). Artifact SHA256:
97bf4b1e1743e1457bbbd8aaa82af19eefefe93bc71cb20a95c2f0b1dc9002ee.
Notification rendering still needs emulator verification. No release APK claim.

Installed-location launch succeeded after fully quitting the build-location app.
The saved session returned to Morgan's actual household dashboard, rendering
networth-75729.59 and monthly600.01 without another login. Public Mac distribution
and Intel runtime checks remain unverified; local app requires the Sandbox
desktop/API services running. The Mac shell is Electron with native platform
integration, reusing the shared planning client.

## September 14 — rebuilt Android icon packaged and installed

Updated only emulator-5554 with the rebuilt debug APK using install-r; installation
succeeded and retained application data. Restarted the same WorthlaneLaptop AVD
with a visible window, without wiping data. Computer Use could not attach to the
standalone qemu executable (Invalid app); therefore delivered-banner inspection
is still unverified. No physical phone or alternate UI-control mechanism used.

Inspected the notification_icon.png files extracted from the actual APK, not just
source artwork. Five RGBA sizes24/36/48/72/96 all contain white visible artwork
and transparent background pixels. Transparent/total pixels by size:
464/576,1068/1296,1968/2304,4429/5184,8102/9216. This proves the corrected
artwork is packaged; it does not prove OS banner rendering. APK SHA remains
97bf4b1e1743e1457bbbd8aaa82af19eefefe93bc71cb20a95c2f0b1dc9002ee.

Next: actual banner through an available supported emulator UI. Mac candidate
0f348c9 CI151 was running at this checkpoint; final public signing/hosted gates
remain unchanged.

## September 14 — Mac unavailable-service observation

Temporarily stopped only the local sandbox runner, with automatic restoration
using the same persisted secrets/database and ports3401/3402. A cold launch of
installed Worthlane.app while port3402 was absent showed the native fallback
alert with Try again/Exit and a clear connection failure message. The custom
offline HTML page was not observed, so that path remains to investigate.
After services restored, fresh CUA state showed the authenticated Morgan/Avery
household with visible networth-75729.59, monthly600.01 and60/40 allocations.
The attempted Retry click lost active-control state; no successful automated
Retry-click claim is made. Local data/session remained intact. No production
change. Restored only automatic Next-generated config changes from this restart.
Current sandbox runtime log: .tmp/mac-recovery-runtime-2.log.


## September 14 — Packaged Mac recovery repaired

Replaced the failing file-protocol recovery load with a restricted secure
worthlane-recovery protocol serving only the packaged HTML and script. No file
privileges or Electron security fuses were relaxed. Chromium's failed-document
finish event had cleared the recovery guard before the original load promise
rejected, allowing duplicate fallback loads and ERR_ABORTED; the guard now stays
active until a real retry. Application loads have a 15-second deadline, including
retries from the recovery button.

An isolated ad-hoc Mac package pinned to absent localhost:3409 visibly rendered
the styled timeout recovery screen. A failed Retry returned to that screen.
After a test-only loopback proxy to the real sandbox desktop was started, Retry
visibly reached the real login page. The proxy and diagnostic app were stopped.
All 19 desktop-native tests and syntax checks pass. The normal local package,
pinned to localhost:3402, passed 8 archived asset checks, 8 fuse checks and strict
ad-hoc codesign verification. Public Mac signing/notarization remains pending;
no production deployment, store submission or financial data change occurred.

The updated app is installed at /Users/tylermedina/Applications/Worthlane.app.
Its first cold connection reached the timeout screen; the native Overview menu
then loaded the saved Morgan/Avery household without signing in again:600.01
monthly plan,56.33 applied,60/40 shares360.01/240.00. Thus recovery and persisted
session are observed, while consistently immediate cold-start loading is not
claimed. Previous installed bundle preserved locally for rollback. Removed only
regenerable diagnostic build directories after testing; original projects,
credentials, database, user screenshots and Trash were not changed this pass.


## September 14 — Mac startup traced to pending Keychain interaction

CI154/34901844323 on52edde6 completed successfully. A fresh saved-session launch
reproduced the timeout. Temporary local diagnostics showed localhost resolving
immediately while the initial request stalled before reaching the server; an
isolated signed-out app reached login normally. Computer Use explicitly refused
to inspect SecurityAgent; no alternate access or credentials were used. Tyler
confirmed handling the Keychain prompt. Retry then loaded the same Morgan/Avery
household. A verified process exit followed by cold launch of that authorized
diagnostic package directly rendered the dashboard, then600.01/56.33 and60/40
allocations without another sign-in.

Corrected the native About/Hide/Quit labels from the npm package name to
Worthlane, preserving the existing application identity and user-data directory.
CUA verified the new labels. Temporary request tracing was removed from source
and the installed app replaced with the normal package. Strict signature/package
verification passed. Ad-hoc rebuilds may require renewed macOS Keychain consent;
public Developer ID signing/notarization remains pending. Diagnostic success is
not a claim that another package has already received OS authorization.


## September 14 — Final installed Mac authorization and cold start verified

After Tyler confirmed completing the handoff, the final normal package's Retry
reached the dashboard title but initially left a blank renderer. A normal Quit
through the native menu was followed by a verified process exit and cold launch
from /Users/tylermedina/Applications/Worthlane.app. The real dashboard then loaded
the saved Morgan/Avery household without login: monthly600.01,56.33 applied,
Morgan60%=360.01 andAvery40%=240.00. This is the normal package, with diagnostic
logging removed, not the earlier isolated/diagnostic build. No data was cleared
and no security settings were weakened. Initial post-authorization Retry's blank
window remains recorded; clean cold-start acceptance now passes.

Fresh `pnpm exec eas whoami` still returns Not logged in. Public signing,
production release controls, remaining provider attestations and store gates are
unchanged. CI155 on66e48a5 had passed all three jobs; this entry adds evidence only.


## September 15 — Expo authentication resolved; hosted signing exists

CLI owner authentication and linked Worthlane project verified. Read-only hosted
credentials show personal-team iOS distribution certificate/profile metadata
throughMarch16,2027 and existing Android JKS signing. Apple portal validation was
not requested and no credential material was downloaded or changed. Prior store
builds exist, but all inspected finished artifacts predate this candidate.

Production EAS API URL points to the existing Railway /api. Development points to
https://your-railway-url/api (placeholder); preview has no variables. These do not
establish an isolated hosted Sandbox suitable for a new acceptance build. Do not
reuse the production API as a Sandbox workaround. Store preparation notes now
correct stale missing-hosted-credentials/debug-signing claims. No paid build,
production mutation or store submission occurred.


## September 15 — Backup rehearsal and deployment safeguards inspected

Added and ran scripts/rehearse-sandbox-backup.py: all29 local synthetic tables and
1,613 rows restored with exact fingerprints and validated constraints. No real
financial data accessed; generated restore DB cleaned up and private evidence
retained. Railway managed backup/PITR is gated by the current Hobby plan; Pro
shows $20 minimum/month plus excess usage. Scoped spending approval is pending.
Production remains on PR13, with Wait for CI off, no configured healthcheck, and
migration-on-start. No plan, deployment, database or service settings changed.


## September 15 — Production migration history verified read-only

Railway Pro is active following Tyler's scoped approval. The production
_prisma_migrations table shows 24 records across three pages, each with a
finished timestamp and one applied step. The latest named migration is
20260909142000_bank_identity. The candidate contains those 24 migrations plus
20260910000100_household_account_matches. Its SQL adds HouseholdAccountMatch,
a sorted-pair check, foreign keys, and two indexes; it does not rewrite existing
financial rows. Historical checksums were not independently compared.

Only migration metadata and table names were inspected. No production data,
schema, deployment, backup schedule, or PITR setting was changed during this
check. Daily/weekly backup scheduling and a fresh snapshot remain prepared but
unsaved pending separate metered-storage approval. After backup verification,
prepare the exact release and migration approval; do not infer deployment
permission from the Pro upgrade.


## September 15 — Approved production backups enabled and snapshot verified

Tyler approved the pending daily/weekly schedule and fresh snapshot. Saved the
production Postgres volume schedule; reopening Edit Schedule confirmed Daily
checked (6-day retention), Weekly checked (27-day retention), Monthly unchecked.
Railway reports the next backup in 7 hours. Created one on-demand backup and
observed Creating backup transition to a 117 MB entry named 2026-09-15 09:20
with Restore available. The older Pre-Security-Patch Backup remains present.

This verifies provider snapshot availability, not a restored production database.
No restore, PITR enablement, deployment, migration, live Plaid call or store
submission occurred. Backup storage is metered under the approved scope. The
backup-approval blocker is resolved; next prepare the exact candidate deployment
and additive migration proposal for scoped approval, retaining other release and
provider gates.


## September 15 — Production-major database CI added

Release audit found local/CI PostgreSQL17 coverage did not match the production
Postgres18 image. The existing isolated persisted-household integration job now
runs a non-fail-fast matrix on both17 and18, applying every migration and checking
consent, privacy and exact budget fixtures. No production database connection is
used. This adds required coverage; the new run is pending and is not yet evidence
of a pass. PR15 description was reconciled with current Mac, signing and backup
evidence. Merge/deploy/migration remain unauthorized.


## September 15 — PostgreSQL18 candidate verification passes

CI162 /34994653500 on569421f passed all four jobs: ci, native-windows,
postgres-integration(17), postgres-integration(18). Both database versions applied
migrations and passed persisted household checks. API, desktop and website builds
also passed. The production deployment proposal is recorded in
docs/production-release-proposal.md; merge and deploy remain pending explicit
approval. This follow-up contains documentation only.


## September 15 — Approved merge and frontend production deployment

Tyler approved PR15 merge, connected production builds, additive migration and
Railway Wait for CI. Applied the single Check Suites false-to-true setting and
verified staged changes cleared. CI163 on78f6bd0 passed all4 jobs, then PR15
merged with expected-head guard as890aa8a96ae432a1f33c3434432d53729f071041.
Post-merge CI164 /34995742197 also passed all4 jobs. Railway deployment
cde39ce8-4ecc-4dcd-99f8-e7f9024a8778 advanced from Waiting for CI to Building;
prior PR13 remains active until promotion. Migration is not yet verified.

Vercel production desktop A2zRj1JVsbDzgmW6tPXz1kJk2zCF and website
9Q7YWHuwjyvXWAKSc9dcJS8ma7ZJ both show Ready at890aa8a with their production
domains. Read-only HTTP checks: desktop login200, protected dashboard redirects
to login, website homepage200, Plaid return200, Apple association200 JSON. These
are deployment/route checks, not authenticated production financial acceptance.
No store submission or additional Plaid settings/Items were created.


## September 15 — Migration applied; health-check port corrected

Railway cde39ce8 built the approved890aa8a candidate and loaded its actual
Nixpacks @worthlane commands after initial stale configuration display. Startup
logs at09:42:48 show20260910000100_household_account_matches applied and all
migrations successful; Next.js then started on3001 and reported Ready. Promotion
failed at the network health-check stage; prior PR13 remained active.

Service-variable inventory had no PORT. Railway health checks use PORT even
when public networking targets another fixed port. Added only PORT=3001 to match
the existing API start command and domain target, reviewed the one-variable diff,
and applied as a routine correction within the approved deployment. Retry
212e2203-3683-4b65-8d27-19568dde70bc is building PR15. Do not infer readiness yet.
No database restore, rollback migration or Plaid changes occurred.
Reference: https://docs.railway.com/deployments/healthchecks

Build logs also emitted generic ARG/ENV secret-handling warnings from Nixpacks.
No secret values were inspected or recorded. Image/build-secret isolation remains
a release-security follow-up; do not treat dependency tests as proof of it.


## September 15 — Approved production rollout verified

Railway retry212e2203-3683-4b65-8d27-19568dde70bc is Active and Deployment
successful on source890aa8a96ae432a1f33c3434432d53729f071041. The merged runtime
configuration includes the candidate @worthlane build/start commands, expanded
watch paths and /api/health with120-second timeout. PORT=3001 corrected the
first deployment health-check mismatch. Public health returns200, no-store and
{data:{status:ready}}. Vercel website and desktop are also Ready on890aa8a.

Read-only production _prisma_migrations verification confirms
20260910000100_household_account_matches finished2026-09-15 09:42:48 with one
applied step. Checksum f406d9b0bb4f28ad84c27251d873f0689748ce48de3fe09bd10534c5b294833b
exactly matches reviewed migration.sql. No production financial rows were read
or synthesized, no restore was performed and no new bank Item was created.

This closes approved merge/deployment/migration execution, not the entire beta
goal. Remaining work includes hosted authenticated acceptance with isolated
Sandbox data, platform-specific production Plaid return/webhook configuration,
truthful provider/security controls including build-secret handling, final signed
artifacts/privacy/reviewer metadata, and public Mac notarization. No store
submission or further paid service authorization is implied.

## September 15 — Workspace support mail verified

Completed the requested Google Workspace mail setup using the existing Tyler
mailbox and support alias. Published missing Google SPF and monitoring-only
DMARC TXT records; both authoritative nameservers returned them. Existing DKIM
signing and MX routing were already active. Added a support label/filter and
reply-from-recipient-address preference. Tyler completed Gmail's separate
send-as popup; support-address sending is now available.

The explicitly approved test reached the support inbox and received the label;
its reply from support@worthlane.app reached the personal Gmail inbox with
SPF/DKIM/DMARC all passing. Live support/privacy/terms pages already use the
correct support address, so no website deployment was needed. See
[Workspace setup evidence](google-workspace-setup.md) for records, workflow,
limits and undo steps. No extra paid seat or service was created.

Internal Workspace MFA remains open: Admin showed two-step verification off,
and Tyler was asked to complete credential enrollment. App transactional email
through Resend remains a separate acceptance item; this Gmail proof does not
close it or the other beta/provider/store gates.

## September 15 — Workspace MFA readback and transactional-email hardening

After Tyler's enrollment, refreshed Google Admin confirms two-step verification
ON and one registered passkey. Organization-wide enforcement remains off; this
evidence is limited to the current Workspace account. No credentials were created
or handled by the agent.

The API email transport no longer logs recipient/reset-code content in development
or includes raw provider/transport error details in exceptions. Production delivery
requires an explicit EMAIL_FROM as well as RESEND_API_KEY, and requests now have
a 10-second abort timeout. Six new tests cover successful payload delivery,
configuration failure before sending, private provider rejection bodies,
transport exceptions, abort handling and development log privacy. All 172 API
tests (25 files) and API typechecking pass. These tests use a stub provider;
they do not claim actual Resend delivery or hosted password-reset acceptance.

This change is on the review branch only, with no production deployment. Next:
verify the configured Resend sender/domain and prepare a scoped deployment plus
approved owned-account reset test. Keep hosted Sandbox, Plaid and store release
gates open until independently verified.

## September 15 — Persisted password-reset single-use protection

Fixed a race in reset-password: the initial unused-code lookup was outside the
transaction, so concurrent requests could both change the password. The
transaction now conditionally claims an unused, unexpired code before changing
the password or revoking refresh sessions. A losing request returns the same
invalid/expired response. Expiry is rechecked after password hashing.

Ran scripts/test-postgres.sh in a fresh isolated local cluster on port 55448.
All 25 migrations applied and all 12 persisted integration tests passed, including
two new password-reset cases. Concurrent attempts produced exactly one success
and one rejection; only the winning password worked, old refresh/old password
were rejected, replay was denied, and the winning password remained valid after
Prisma disconnect/reconnect. Expired codes left the password unchanged. API
typechecking passes. This does not claim immediate revocation of already-issued
15-minute access JWTs or actual provider email delivery.

Tyler signed into Resend. Prepared unverified mail.worthlane.app sending-domain
registration and inspected its exact DKIM plus send.mail MX/SPF requirements.
Resend receiving remains disabled. Production DNS authorization is requested;
no DNS record, API credential, email send or application deployment was performed
as part of this Resend preparation.

## September 15 — Approved Resend DNS records published

Published the three expressly approved Resend records for mail.worthlane.app:
resend._domainkey.mail TXT, send.mail MX (priority 10), and send.mail SPF TXT.
Both authoritative Vercel nameservers and a recursive lookup return the exact
records; root Google MX remains smtp.google.com. Resend verification was started
and is Pending on refreshed provider readback. Receiving is off, and no API key,
paid plan, email send, application setting or deployment was included.
See [transactional email setup](transactional-email-setup.md) for the remaining
provider/credential/transport and real-delivery gates.

PR16 CI165 has passed PostgreSQL17 and18 persisted checks plus Windows packaging;
the main CI job is still running. Do not report the entire run passed yet.

Follow-up readback: Resend now reports mail.worthlane.app Verified, with its
verification event at 10:14 AM Arizona time. DKIM/MX/SPF records all show Verified;
sending is on and receiving remains off. Credential/configuration, TLS policy,
approved real delivery and PR16 production deployment remain separate next steps.

## September 15 — Support replies prepared for transactional mail

PR16 CI165 completed successfully in all four jobs at cf07b07. Added optional
EMAIL_REPLY_TO so automated-message replies can reach support@worthlane.app.
Seven focused email tests and API typecheck pass for this follow-up change.
Production sender/reply-to settings and deployment are still pending approval.

Tyler created the sending key in Resend and authorized storage in the Mac login
Keychain. The key-value dialog is visible; no value was printed or saved in the
repository. Keychain Access observations time out, so secure storage is not yet
confirmed. This is distinct from configuring the production API.

Follow-up at 10:25 AM: Keychain Access became responsive. Saved the existing
Resend key under the expressly approved login Keychain item and verified its
name/account/kind/keychain metadata. Closed the provider one-time key dialog;
the API-key list shows Sending access and No activity. No production environment
change or email was sent. CI168 at 45acc12 is running; fresh production health
returns ready. The credential-storage blocker is resolved.

## September 15 — Approved email rollout and web recovery gap

CI168 and CI169 passed all four jobs. Under explicit approval, PR16 f8440b3
merged as 21f14e7dc4ec106eefc4735392e8bc30168ac9ef. Main CI35001849078 passed.
Resend Enforced TLS was saved and verified. Railway sender/reply-to rollout
4ba2a90f-dce7-4c02-a093-a80a449c2bbd became Active. The existing Railway key
fingerprint did not match the approved Keychain credential. Replaced only
RESEND_API_KEY with the tested key using an encrypted in-memory transfer and
dispatched the approved correction; final correction deployment remains pending.

The approved direct Resend test returned 200 and arrived in tyler@worthlane.app's
Inbox at 10:41 AM. Gmail details show sender no-reply@mail.worthlane.app,
reply-to support@worthlane.app, mailed-by send.mail.worthlane.app, signed-by
mail.worthlane.app and TLS. The first request returned 403; retrying with an
explicit client User-Agent and the same idempotency key produced the single
accepted message. Approved synthetic account tyler+worthlane-beta@worthlane.app
was created (201), with no financial data. Its first reset request returned 200
but no email was found before the credential correction. This is not reset
acceptance yet; retry only after the corrected deployment is Active.

Found and implemented the missing web login recovery entry point on
codex/web-password-recovery. New same-origin BFF routes use existing API auth
logic and trusted proxy IP headers; reset success clears browser session cookies.
The two-step page supports code requests, existing codes, password confirmation,
busy/error states and return to sign-in without exposing tokens in URLs/storage.
Local persisted HTTP test passes invalid/cross-origin/short-password/replay
rejection, password mutation across Prisma reconnect, old/new password login,
no browser-visible JWTs and non-enumerating absent-email behavior. The fixture
is isolated to localhost worthlane_beta_test and removes only its synthetic user.
Command: WORTHLANE_TEST_DATABASE_URL=<local-test-url> node scripts/test-web-password-recovery.mjs.

Desktop typecheck and isolated production build (.next-http-3405) pass. Browser
checks cover desktop rendering, request-to-code progression, existing-code/back
navigation and heading focus. At 390px, inputs are 49px high with 16px text and
there is no horizontal overflow. Browser password submission is not claimed;
the persisted mutation is verified through the local HTTP test. These new web
changes are separate from the approved PR16 deployment and are not published.

Follow-up: verified-key correction a5627e4b-52fa-4e45-9d2b-4a69eff37d86 is Active;
health returns ready. The post-correction hosted reset email was delivered at
10:55 AM and found in the owned Workspace Inbox. Synthetic reset succeeded
(200), old password and old refresh token were rejected (401), new password
logged in (200), and code replay was rejected (400). No financial data or other
account was changed. See transactional-email-setup.md for provider/deployment IDs.
Both Vercel production deployments succeeded on 21f14e7. PR17 CI171 at e8ffdff
passed all four jobs, including PostgreSQL17/18 and native Windows. The new
web recovery UI remains unpublished pending separate approval.

## September 15 — isolate local acceptance from email and paid AI

Found both dev-sandbox.mjs and test-http.mjs spread inherited environment values
without disabling Resend or Anthropic credentials. A production credential in
the shell or local env file could therefore enable external delivery/spending
while running a nominally local acceptance journey. Both launchers now set
ANTHROPIC_API_KEY, RESEND_API_KEY, EMAIL_FROM and EMAIL_REPLY_TO to empty values
after inherited and Sandbox overrides. Plaid remains Sandbox; parent environment
and production settings are unchanged. Existing running servers are not restarted
by this source change; it takes effect on their next normal launch.

Validation: both scripts pass node --check and git diff --check. Evaluated each
actual child-environment expression with synthetic inherited email/AI credentials
and a synthetic Sandbox override: all four disabled fields are empty, Plaid is
Sandbox, and the parent environment is unchanged. No external email/AI call was
made by this validation. This change is isolated from the pending PR17 approval.

Fresh Mac signing inventory reports three valid code-signing identities but no
Developer ID Application identity. Public Mac distribution remains unproven;
the existing local ad-hoc build must not be described as notarized distribution.

## September 15 — approved web recovery publication verified

Tyler approved PR17 at 5a53d61. All four CI172 jobs passed; PR17 merged as
847a0fbb0c8c790b4df69d0ef064e4630c9c3a16. Vercel production desktop deployment
6465252902 succeeded. The hosted /login page exposes Forgot password? and opens
/forgot-password. The actual browser request for the previously approved
synthetic account progressed to Choose a new password with the generic message.
Resend message 8d77ba7a-a918-4821-bfb3-c70371615348 was delivered for that request.

Using the email's code, an HTTP test through the deployed desktop BFF verified:
cross-origin rejection403; reset200; old password401; new password200; replay400;
no-store response, cleared session cookies and no browser-visible JWTs. This
complements actual browser request/navigation evidence; password field entry
and submission were not performed through Computer Use. Only the dedicated
approved synthetic account was affected. Private code transfer was encrypted,
with ephemeral transport keys removed after use and no code printed.

Main CI35005122474 and the corresponding Railway rollout were still pending
at this checkpoint; existing API health remained ready. PR18 local email/AI
isolation remains a separate draft, rebased by merge onto the approved PR17
baseline with both progress histories preserved. No PR18 merge is authorized.

Final rollout readback: main CI35005122474 passed all four jobs. Vercel website
deployment6465272846 and desktop6465252902 both succeeded for847a0fb. Railway
explicitly marks PR17 Skipped / No changes to watched files; the already-verified
PR16 API remains Active with the corrected email credential. No redundant API
redeploy was needed. This closes PR17 publication verification.


## September 15 — Hosted Mac candidate built and installed locally

- Built the existing Electron shell against `https://worthlane-desktop.vercel.app`
  with production URL validation and `developmentOnly:false`. Native sources at
  build HEAD5a53d61 match deployed main847a0fb (`git diff` for native/mobile empty).
- Installed separately at `/Users/tylermedina/Applications/Worthlane Hosted Beta.app`;
  the previous localhost app is preserved. No production deployment, upload,
  paid build, bank connection or store submission occurred.
- Passed19 native tests, hosted-origin header verification, all8 archive assets,
  all8 hardened fuses and `codesign --verify --deep --strict`.
- Actual packaged UI showed hosted sign-in, opened Forgot password with heading
  focus, returned to sign-in and passed normal Quit/cold relaunch. Installed-path
  launch also reached hosted sign-in. No credential/reset mutation was repeated.
- Archive SHA256: `de649050b3971a62deb3e8ad44d72158467ca4d5e0fecc3891f3b7e77e03b271`.
- This candidate removes localhost dependence for the Mac entry point. It is
  ad-hoc signed for local use, not Developer ID signed or notarized for public
  distribution. Hosted authenticated household/banking acceptance is not claimed
  by this launch check; the separate persisted Sandbox journey evidence remains
  the basis for functional acceptance. Current iOS/Android distribution artifacts,
  store screenshots/privacy/reviewer preparation and Plaid evidence gates remain.

## September15 — Persistent account-deletion acceptance

Added a real PostgreSQL integration test invoking the account-deletion and
refresh route handlers without mocking Prisma. An unauthenticated delete is
rejected; after owner deletion and Prisma reconnect, owned account/category/
budget and refresh-session rows are absent, the departing member is REMOVED
with no user link, and the surviving partner retains exact account/budget rows,
ACTIVE ownership and a usable refresh session. The custom responsibility becomes
100% assigned to the remaining member. Deleting that last member then removes
the empty household and responsibility, again verified after reconnect.

The focused test and API TypeScript check pass against the isolated local
worthlane_beta_test database at127.0.0.1:55439. Cleanup targets only randomly
created fixture IDs. No email, real Plaid Item, production deletion or store
submission occurred. This supplements the existing mocked provider-failure/retry
tests; it does not claim real provider revocation or release-service deletion.
App Store Connect currently requires a fresh user sign-in before draft work can
continue; the sign-in tab is open and user input has been requested.

### September15 — Real Sandbox account-deletion revocation verified

Extended PR19 with account-deletion.sandbox.ts. It creates only a random local
synthetic user and a new Plaid Sandbox Item, exchanges through the application,
invokes the account-deletion route, and independently verifies provider
itemGet returns ITEM_NOT_FOUND. After Prisma disconnect/reconnect, user, Item,
account and transaction rows are absent. Cleanup is scoped to the created user
and Item; SDK errors are replaced by bounded stage labels to avoid credential
output. No production bank Item, email or production user was involved.

Both real Sandbox tests passed (existing sync/owner isolation/liabilities/relink/
unlink lifecycle plus new account deletion) in18.76seconds. API typecheck passed.
PR19 initial CI180 has passed PostgreSQL17/18 and native Windows jobs; general CI
was still running when checked. The new Sandbox test is run explicitly with
Sandbox credentials, not by ordinary CI. This closes provider revocation evidence
for local Sandbox account deletion; release-service deletion remains unverified.


### September 18, 2026 — standalone iOS persisted two-login checkpoint

EAS iOS artifact `bb102818-1876-422c-ac62-6055de147467` restored Avery's account,
bill and reminder, presented a fresh test notification, cleared its history on
logout, and admitted Morgan's separate account without Avery's private data.
Morgan's native Sandbox sync and an independent hosted verifier passed. Source
copy now distinguishes the total unpaid payment count from the next-seven-day
amount; mobile typecheck passed, next artifact visual check remains. Full
artifact identity, evidence and limits are in hosted-sandbox.md. Android EAS
`c9853f0d-37bc-49d9-aa11-2c58d0b82397` is still queued; no replacement job started.

### September 18 — Android Sandbox connection milestone

Standalone Android release completed interactive First Platypus Bank Link and returned Healthy with 14 accounts. Fresh-login verification passed the partner's complete 392-transaction ledger, repeat-sync idempotency, preserved $125.50 manual fallback and $42.75 bill, isolation from the owner's 49-row ledger, and existing responsibility/debt persistence. See `docs/hosted-sandbox.md` for artifact and emulator-recovery limits. Next: native repair/OAuth/unlink, reminder checks and final candidate parity; no production change or store submission.

### September18 — Android reminder acceptance

Signed standalone Android Sandbox build delivered its DATE test reminder to the notification shade with the correct icon and generic content. OS AlarmManager confirmed the persisted one-day-before bill reminder at September20 09:00 (one-hour inexact window). Native logout reached sign-in and removed all pending Worthlane alarms and notification records. See hosted-sandbox.md for evidence and timing limits. Recovered677MiB of reproducible build output;3.8GiB disk free. Next remains hosted OAuth/error/unlink and final artifact parity; no production or store submission.

### September 18 — current native parity and honest desktop freshness

Current Android artifact22734e79 (source1dd2196) passes Chase OAuth, selective
unlink/provider revocation, forced repair and reminder/logout cleanup. Current
iOS Simulator artifacteb664bae passes standard Link/import/sync/unlink, forced
repair and reminder cleanup; Simulator OAuth remains unverified. Exact packaged
Mac OAuth, cancellation/retry, forced repair and selective unlink passed; the
full owner49/partner392 transaction baseline was restored with privacy intact.
Native shell23 tests and package9 assets/8 fuses/signature checks passed; all four
CI jobs passed on a0fe748. Detailed artifact evidence is in hosted-sandbox.md.

Desktop headers now use the financial summary asOf rather than the household
edit timestamp, with date and household timezone. Bank retrieval dates remain
separate. Demo says Demo snapshot and absent timestamps say unavailable. Local
frontend against hosted Sandbox visibly verified overview/accounts timestamps
and separate retrieval dates, demo wording, and a 390px accounts layout with
390px scroll width. Desktop typecheck and diff checks passed.

Next: isolated fully hosted frontend (prepared Vercel project awaits approval
for its specific proxy-secret destination), public Mac signing/notarization,
iOS OAuth and privacy/store gates. Existing Vercel previews target production
and must not receive synthetic accounts. No merge, production change or store
submission is authorized by this milestone.

### September 18 — reproducible hosted acceptance setup

Resolved PR20 review finding: hosted fixture creation now uses the existing Next
environment loader, supporting documented apps/api/.env, .env.local precedence
and shell overrides. Sandbox environment and required credentials are validated
before any remote test-data creation; credential values are never used in error
messages. Three offline regression tests (six isolated subprocess cases) pass
for file/shell precedence, production rejection and missing credentials. Added
this check to CI; script syntax and diff checks pass. Existing fixtures were not
changed. Isolated hosted frontend approval and release gates remain unchanged.

### September 18 — packaged privacy declarations

Inspected14 privacy manifests inside the current standalone iOS Simulator
artifact eb664bae/source1dd2196. Committed exact declarations and file hashes;
store draft now distinguishes Plaid UserID, RevenueCat purchase-history and
Sentry diagnostic declarations from runtime feature gates. No final store
privacy answers, network-audit claims or provider-setting changes made. Final
device archive/disclosure alignment remains open. CI35389472877 is live on
af072f5; PostgreSQL17/18 persisted checks passed, final job conclusions pending.

### September 18 — bounded native Refresh

Observed intermittent blank windows after the native Refresh menu, including a
signed-out page. Temporary lifecycle diagnostics showed no renderer-crash or
load-failure event, and a later attempt succeeded; exact root cause is not proven.
The menu's Electron reload role bypassed Worthlane's existing bounded navigation
path. Refresh now loads the current allowed-origin URL through that same
15-second timeout/connection-recovery path, falling back to the configured URL
when on the internal recovery page. No origin/security permissions were widened.

All23 native tests and syntax checks pass, including stalled-load recovery,
origin pinning and OAuth-window isolation. Interactive development runtime
against local frontend/hosted Sandbox passed signed-out Refresh and authenticated
Morgan Refresh, retaining the $2450 household plan and current snapshot. This
mitigation has not yet been replayed in a newly packaged artifact or a fully
hosted frontend; do not describe the intermittent root cause as resolved.

### September 18 — Mac rendering comparison

Exact bfe8cb3 local package ASAR98578d64ab1be6418bfbc3dae0702fbe76bfbe34b99c96d9d83a5882bb4f7600
passed assets/fuses/signature, but normal rendering repeatedly blanked after
Refresh. Waiting beyond15s did not restore it; native resize restored the
already-loaded household twice without login/reload. Reopening the same package
with --disable-gpu retained the session and completed two dashboard refreshes
and an accounts-page refresh without resizing; accounts route, Healthy bank
connection and $2450 plan persisted. The first observation was briefly empty
but subsequently rendered by itself, unlike the earlier persistent blank state.

Added the supported app.disableHardwareAcceleration() before readiness on macOS
only, retaining Windows behavior and all security settings. This is a measured
compatibility workaround, not proof of a specific upstream GPU bug. Software
rendering may cost CPU/battery; exact new packaged replay and bank-popup parity
are still required. API reference: https://www.electronjs.org/docs/latest/api/app#appdisablehardwareacceleration

### September 18 — exact software-rendering Mac package replay

Source2a50752 local package `.tmp/mac-software-fixed/mac-arm64/Worthlane.app`
(ASAR `b8d3719a9b1fa89236c02040926f1d70d14c2064e4816512314d1eb6030c69bd`)
passes9 assets/8 hardened fuses/strict signature checks. All4 source CI jobs
passed in35391591517. After the macOS authorization process cleared, the
existing recovery Retry restored Morgan without restarting. Native Refresh on
overview and Accounts then rendered normally without resizing, retaining the
saved session, route, privacy and $2450 plan.

Exact package also completed Chase Sandbox OAuth popup, simulated MFA and one
checking account selection, returned to Link and saved the connection. Separate
API verification confirmed1 new account/148 imports and all197 owner transaction
objects unchanged on repeat sync; partner15 accounts/392 IDs remained private.
The first verification hit409 while initial sync was still active; retry passed.
Selected native unlink removed only that added Chase connection. A guarded
provider observer confirmed database removal and ITEM_NOT_FOUND. Full fresh-login
`WORTHLANE_HOSTED_SANDBOX_APPROVED=true node scripts/test-hosted-sandbox.mjs --verify`
then passed original owner49/partner392 ledgers, manual fallback, responsibilities
and debt/due-date idempotency. UI returned to15 accounts/one institution.

This closes the current local-package Refresh and OAuth-popup regression. It
does not establish CPU/battery performance across Macs, final device-store
acceptance or fully hosted frontend behavior. The package is ad-hoc signed and
pins localhost3403 against the isolated hosted Sandbox API. Fully hosted frontend
credential-destination approval, public signing, iOS OAuth and privacy/store
gates remain open. No production changes or store submission.

### September 18 — approved isolated Vercel frontend created

Tyler approved creation/deployment of `worthlane-beta-desktop` on the existing
Hobby team and transfer of the existing Railway beta-sandbox proxy secret into
that exact project. Created with root `apps/desktop`, Next.js, and only two
project environment variables: `WORTHLANE_API_URL` pointing to
`https://worthlane-beta-sandbox.up.railway.app/api` and
`WORTHLANE_DESKTOP_PROXY_SECRET`. Both are sensitive values for this project's
Production/Preview environments. Source credential was validated against exact
Sandbox project/environment/service IDs and `PLAID_ENV=sandbox`; its value was
transferred in memory without writing it to source or evidence.

Set this new project's primary branch to `codex/hosted-sandbox-acceptance` and
created deployment `6o3N9QAGtZUsj21zEdQEscYdwDkE` from CI-green `aa3e488`.
Canceled the superseded initial main import `opMba9sPBo9cPGhyaExKJAPTqovt`.
Target primary origin is `https://worthlane-beta-desktop.vercel.app`.
Existing production projects, API, database, Plaid settings and paid plans were
not changed; PR20 remains unmerged and nothing was submitted to a store.

Candidate remains QUEUED, with no successful build/runtime acceptance claimed.
Vercel's official status page reports a Build & Deploy partial outage,
"Elevated Errors Triggering Deployments", investigated since September18
20:32UTC and updated20:56UTC: https://www.vercel-status.com/ . Older team builds
also remain initializing/queued. Do not create duplicate deployments or upgrade
plans as a workaround. After recovery, verify the candidate deployment and
persisted synthetic browser sessions, then package/verify the Mac app pinned to
this HTTPS origin. Local-package OAuth/Refresh evidence remains separate from
fully hosted acceptance. Public Mac signing, iOS OAuth and privacy/store gates
remain open.

### September 21 — isolated HTTPS browser acceptance

Verified clean local source `9d84d1ee2024efbda6b6b4f2a2162addf7ec5178`.
Vercel dashboard independently shows Ready deployment
`3H6K6JGD4WHpB6NDsjM6FoJ93uZQ`, that same source, at
`https://worthlane-beta-desktop.vercel.app`. The former deployment outage is no
longer the blocker. Origin verification passed the desktop identity header.

`WORTHLANE_HOSTED_SANDBOX_APPROVED=true node scripts/test-hosted-desktop.mjs`
completed successfully against that HTTPS origin using only the existing0600
local synthetic fixture. It verified anonymous401, cross-origin403, protected
host-only HttpOnly/Secure cookies, both saved logins, disjoint private accounts
and complete ledgers, the2450 household responsibility total, refresh rotation,
and logout refresh-token revocation. Credentials/tokens were not exported.

Actual IAB Morgan login rendered the saved household,300/300 Groceries,
Avery150 Utilities,1020/680 Rent, and private100 manual fallback. Chase Sandbox
OAuth handoff exposed no popup in this IAB inventory; canceled and observed
"Bank linking closed". This is not successful hosted OAuth evidence.

Actual standard First Platypus Sandbox Link completed, saved14 new accounts,
and displayed29 total accounts/two institutions. Independent API checks found
439 complete owner transactions (49 existing +390 added), all stable across
repeat sync, with exact original account/transaction objects retained. Partner
15 accounts/392 transaction IDs remained unchanged and private. Visible Sync
completed. Healthy Reconnect completed in update mode with the same Item,
account and transaction IDs. Guarded provider reset affected only the added
Item; visible Sync showed Needs Relink and incomplete-spending warning. Password
reauthentication returned Healthy with all439 records stable and partner privacy
preserved. Selected unlink removed only the added Item. A guarded in-memory
provider observer independently confirmed database removal and ITEM_NOT_FOUND.
Reload retained Morgan's original15 accounts/one institution and manual100;
see `docs/evidence/2026-09-21/hosted-browser-restored.txt`.

A subsequent full-login rerun hit HTTP429 after repeated synthetic logins; this
is recorded as a rate-limit interruption, not a successful post-cleanup run.
No rate-limit setting was weakened. Initial full BFF run passed before linking.

Local Mac test package from9d84d1e pins the verified HTTPS origin, developmentOnly
true, appId com.worthlane.desktop.sandbox; nine assets/eight hardened fuses pass.
ASAR SHA256:
`b01e30cd54fb97671db299626607e1b866441a8d7e09987d69299563bbb26749`.
Path `.tmp/mac-hosted-20260921/mac-arm64/Worthlane.app`. This uses local ad-hoc
packaging, no Developer ID credential, notarization or store distribution.
Startup coincided with SecurityAgent; requested user handling without inspecting
it. After that process disappeared, native app remained on recovery. Native
View/Refresh changed title to hosted login, but screenshot and AX retained the
recovery frame until the window's zoom action. Zoom exposed actual HTTPS login.
This rendering/recovery regression contradicts a claim of complete hosted Mac
parity; authentication/cold-launch/OAuth remain unverified for this exact package.
No implementation fix, merge, production configuration or store submission here.


### September 21 continuation: post-unlink and Mac session checks

The guarded full hosted BFF verifier completed successfully after the login
cooldown (session 57150, exit 0): protected cookies, cross-origin rejection,
persisted two-login privacy/totals, refresh rotation and logout revocation.
This closes the earlier post-cleanup HTTP429 verification gap without changing
rate limits.

The exact local Mac Sandbox package above authenticated Morgan. Initially the
window title advanced while accessibility content and screenshots remained
stale; a window zoom exposed the saved dashboard in accessibility. Native
menu Quit followed by a full launch then visibly restored Morgan's saved
session, household 2450 plan and private100 manual account without resizing.
Cold-launch persistence is now observed, but the earlier rendering/recovery
failure is unresolved and is not claimed fixed. Mac OAuth remains unverified.

After that restart, Accounts & privacy navigation also rendered correctly in
both AX and screenshot: 15 original accounts, one institution, zero attention,
private100 manual fallback. This recovery does not establish a root cause or
prove the initial stale-frame problem cannot recur.


### September 21 hosted Mac OAuth connection and healthy reconnect

Using the exact ad-hoc Sandbox Mac package recorded above, Connect bank →
Continue without phone number → Chase → Continue to log in opened the separate
cdn.plaid.com simulated OAuth window. Public Sandbox credentials/code and all
14 test accounts completed simulated consent; the popup closed, Plaid returned
to Worthlane, and Finish without saving produced Connection saved. The native
accounts page showed29 accounts/two institutions/zero attention, Chase Healthy.

An independent API verifier initially collided with the in-progress initial
sync (409); its later successful run confirmed14 new accounts and439 complete
owner transactions (49 original +390 added), exact original transaction objects
retained, no repeated-sync duplicates, and partner15 accounts/392 transaction
IDs unchanged/private. No rate-limit or concurrency safeguard was weakened.

Healthy Reconnect repeated the actual OAuth popup/challenge/consent/return
flow. After the final Finish without saving returned Connection saved, a fresh
independent run (session23378, exit0) verified the same Item,14 account IDs and
390 added transaction IDs,439 stable owner rows, and unchanged private partner
ledger. See `docs/evidence/2026-09-21/hosted-mac-oauth-saved.txt`.

This establishes hosted Mac OAuth connect and healthy reconnect, not forced
login-required repair or selected unlink for this new Item; those remain next.
The local0600 `.tmp/hosted-mac-sep21-link-fixture.json` identifies the added
synthetic Chase Item for scoped follow-up. Initial stale-frame/recovery behavior
also remains unresolved. No production banking, merge, store submission or
release signing occurred.


### Verification correction: transaction-ID selection

During forced Mac repair verification, the temporary lifecycle helper was found
to use transaction.accountId although the API returns transaction.account.id.
Its added-bank transaction-ID subset was empty. Earlier full-ledger repeat-sync
comparisons, original-row checks and complete partner-ledger comparisons remain
valid, but the claimed preservation of the390 added transaction IDs across
reconnect/repair was not established by that helper. This correction supersedes
those specific ID-preservation claims above.

The Mac did show Needs Relink/14attention with retained balances after scoped
Sandbox reset, and actual OAuth reauthentication returned Healthy/zeroattention.
Database check confirmed HEALTHY, needsRelink false, errorCode null. The separate
API check initially hit429; no limits changed. After cooldown, corrected committed
`scripts/test-hosted-linked-bank.mjs --capture` with explicit Sandbox opt-in
passed:14accounts,390nonempty added transaction IDs,439stable full owner rows,
original objects and partner15accounts/392transaction IDs preserved. The new
verifier uses account.id and refuses an empty historical transaction baseline.
Syntax and no-approval guard checks pass.

Next: repeat forced repair against this corrected nonempty baseline with
`WORTHLANE_HOSTED_SANDBOX_APPROVED=true node scripts/test-hosted-linked-bank.mjs --verify`,
then selected unlink/provider revocation. The added Chase Item remains present
for that test. Failed observer attempts were terminal and did not unlink or
mutate data. Initial Mac rendering reliability remains unresolved.

# Beta acceptance status — updated September 22, 2026

Source of requirements: [Worthlane brief](https://app.notion.com/p/3d57f32d407581d9a9eafcdb4d5ac152).
The beta goal remains **active, not complete**. This index summarizes dated
acceptance evidence; it does not freshly verify deployed code, provider settings
or every journey. The [completion audit](beta-completion-audit.md) separates the
original beta requirements, added investment scope and release/provider gates.
Exact commands, failures and superseded states remain in
[beta-progress.md](beta-progress.md) and [hosted-sandbox.md](hosted-sandbox.md).

The recorded main baseline is `4b22bec` (approved PR19 merge, rechecked September 22).
Subsequent work is on the pushed `codex/hosted-sandbox-acceptance` branch / PR20;
that branch is not merged. Isolated hosted Sandbox deployments and native
artifacts have separate source versions; do not call the main baseline or a
particular artifact the current deployment without checking it.

## Original beta requirements

| Required outcome | Recorded evidence and remaining limit |
| --- | --- |
| Solo onboarding; invitation before registration; separate consenting logins; maximum two members | PostgreSQL and HTTP tests cover invitation replacement/acceptance, denial before consent, third-member rejection and new-session persistence. Recorded Jamie solo/manual and Morgan/Avery two-login interactions are supplemented by September 21 Alex/Sam hosted native reviewer journeys. Families use the same one/two-adult model. |
| Owned, equal and custom category responsibilities; clear personal/household totals | Persisted fixtures verify $600 → $300/$300, $150 assigned to one partner, and $1,700 → $1,020/$680, totaling $2,450 once. Tests cover cents/refunds/history/privacy. Actual native 60/40 editing, rejection of 110%, second-login readback and September 21 exact fixture readbacks pass. Responsibility remains independent of who paid. |
| Plaid spending with manual fallback; connect, repair, sync, cancel and unlink | Real Sandbox integration and interactive browser, Mac, iOS and Android evidence are recorded separately. Hosted Android OAuth/import/repeat sync/forced repair/selective unlink pass; hosted iOS standard Link/import/sync/forced repair/selective unlink pass. Web popup and full-page return have recorded acceptance. Updated hosted iOS Simulator OAuth remains unverified; earlier local native OAuth success does not close that later artifact gate. No actual-bank acceptance is claimed. |
| Privacy and no double counting | Persisted tests cover pending/posted edits and removals, transfers/card repayments, manual/import review, solo duplicate feeds and bilateral account matching/revocation. Two-login interactions and complete ID/ledger comparisons verify private account isolation and selected unlink preserving unrelated manual/partner data. Hosted browser concurrent refresh and cross-tab logout clearing passed in September 21 checks. |
| Reliable bill/card due dates and reminders | Saved bill edits, payment state, stale-update rejection, distinct card current/statement/minimum/due fields, manual fallback and estimate labels have persisted and interactive coverage. iOS/Android DATE test reminders actually reached OS presentation/history; logout removed queued/delivered reminders. Tests cover selected dates and local 9am scheduling. Actual future calendar-time/9am delivery and physical-phone delivery remain unobserved. |
| Explainable saved debt-payoff plans | Deterministic tests cover avalanche/snowball, zero APR, promo transitions, cents, insufficient/non-amortizing payments and owner isolation. Separate native/browser logins preserve saved plans and distinct debt fields; repeated minimum-to-obligation conversion is idempotent. September 21 Alex/Sam reviewer checks include private plan/bill isolation. No automatic payments or transfers. |
| Aesthetic app and website; beta list | Approved website redesign and persisted consent-based signup were published and verified, including deduplication/cleanup. Forest/cream native screens and current planning layouts were inspected. Four refreshed screenshots were saved in the Apple draft September 21. Signup does not imply automated marketing messages. |
| Regression assurance and evidence | Full branch CI run `35765231000` at `36ef044`, all four jobs passed, including PostgreSQL 17/18, regressions/typechecks/builds/mobile bundle and Windows packaging. Investment regression records 199 API tests and isolated 13 PostgreSQL + 3 real Sandbox tests; later native wording has a passing mobile typecheck. These results do not claim CI for later commits or uncommitted work. Commits and milestone updates are recorded in Git/Notion. |

## Added investment scope — September 22

Tyler requested Chase, Wells Fargo, Desert Financial and Charles Schwab, including
both Schwab checking and brokerage/retirement. Ordinary banking and the new
**Connect investments** path have different data semantics. Investment-only
connections contribute private account balances to net worth; they do not import
holdings, trades or household spending. Production Investments remains gated.

| Investment check | Recorded result |
| --- | --- |
| Product-aware persistence/privacy | Real Plaid Sandbox tests create an Investments-only Item without initializing Transactions, keep stable account IDs, reject the other login, and verify unlink with provider `ITEM_NOT_FOUND`. Filtering retains only investment account types and rejects a connection with none. The current focused Sandbox regression also verifies forced expiration, retained balances/IDs/freshness, owner-only update-token creation and a pending repair state without Transactions or cross-login leakage; focused test/typecheck pass. This is repair preparation, not completed reconnect. |
| Browser standard connection | September 22 native Chrome UI connected IRA $320.76 and 401k $23,631.98: net worth $23,952.74, zero spending rows. Repeat sync, reload, fresh sign-in and UI unlink pass with independent PostgreSQL readback. The in-app browser's blank Plaid frame is recorded separately. [Evidence](evidence/2026-09-22/investment-browser.json). |
| Native standard connection | iOS laptop Simulator development build `95061ba9` with the current Metro bundle connected exactly those two investment accounts. Repeat sync and full restart retained $23,952.74 with zero spending/income; UI unlink and another restart returned to zero, confirmed by API and PostgreSQL. This UI run checked local removal; provider revocation comes from the separate Sandbox integration test. [Evidence](evidence/2026-09-22/investment-native-standard.json). |
| Investment OAuth / distributable parity | **Not passed.** A fresh native App2App retry visibly checked IRA/401k, then returned to the login prompt without exchange. Clean cancellation left usable Settings and zero accounts/Items; filtered events ended with EXIT and no error code. [Retry evidence](evidence/2026-09-22/investment-native-oauth-retry.json). No cause is proven. Browser/native standard success is not OAuth evidence. Hosted deployment, Android investment UI and store-build investment parity are unverified. |
| Real banks / provider access | September 22 dashboard inspection recorded Chase and Schwab OAuth Enabled and Wells Fargo/Desert Financial product coverage. Transactions/Balance were enabled; Investments/Liabilities were not; Compliance Center still required action. Investments pricing and activation approval remain open. Institution coverage is not an account-specific live connection. |

## Distribution and provider boundary

- **Mac:** personal-team Developer ID signing, hardened runtime/timestamp, asset/fuse
  checks and September 22 authenticated cold launch pass for the recorded Sandbox
  package. It is **not notarized or published**. Earlier packaged banking evidence
  and the new signed-session evidence have distinct scopes.
  [Signing/session evidence](evidence/2026-09-21/mac-developer-id-signing.json).
- **Apple:** Sandbox build 30 from `74c6bbf` was uploaded under approval, processed,
  selected and reload-verified in the saved **Prepare for Submission** draft with
  manual release. It **predates the investment feature**. Four screenshots and
  private Alex/Sam reviewer access are saved; the six-type privacy draft is
  unpublished. Existing owner-only Team (Expo) access was assigned automatically;
  no external tester invitations or App Review submission occurred.
  [Upload/draft evidence](evidence/2026-09-21/ios-store-30-upload.json).
- **Remaining:** current-candidate/hosted parity, native investment OAuth,
  actual calendar-time reminder observation, supported-platform coverage,
  substantiated Plaid security/content-rights requirements, production
  configuration/pricing, Mac notarization and store/privacy preparation must be
  reconciled before completion. Google Play access/signing/fee questions remain
  separate. See the completion audit for specific gates.

Existing scoped website, email, hosted Sandbox and private Apple-upload approvals
are recorded as fulfilled, not pending again. They are not blanket authority for
new production changes or spending. No main merge, live bank connection, new paid
product activation, public distribution or store submission is implied by these
checks. Work remains laptop-only; physical-device readiness is not claimed.

September22 local native saved-session read-failure/Retry and restored cold launch
now pass without credential reentry. Temporary injection was removed byte-for-byte;
[evidence and limits](evidence/2026-09-22/native-startup-retry.json).

September 22 hosted candidate update: API df12257 / CI286 is active in the approved
isolated Sandbox. Actual Plaid-signed full-Item revocation removed its disposable
fixture; unsigned/invalid requests were rejected. Existing owner53/partner396
ledgers, private fallback, $2,450 household plan and debt/due-date checks survived
deployment and cleanup. See `evidence/2026-09-22/hosted-signed-webhook.json`. The
consentRevision migration is Sandbox-only; production and store gates remain.

## September 22 — native investment repair verified

First Platypus non-OAuth investment update mode now passes in the laptop iOS
development Simulator. An API-created, forced-expired Sandbox Item was repaired
interactively; clearing/retyping the public test password resolved the prior
rejection. Worthlane displayed Connection repaired and Healthy. Independent
API/DB/provider readback preserved exact account IDs/balances: two investment
accounts, $23,952.74 net worth, zero transactions/spending, Investments product
only, and no remaining provider login error. Repeat native sync and cold launch
preserved totals and the signed-in session. Fixture retained for further checks.

This supersedes the earlier non-OAuth repair blocker, not the native OAuth return
blocker. No live bank, paid product, production deployment, main merge, or store
submission occurred. [Evidence](evidence/2026-09-22/investment-native-repair.json).

## September 22 — account-selection cleanup

Completed the missing-account privacy reconciliation identified in c65efda. A
successful complete provider account snapshot now atomically removes missing
accounts and their imports/derived caches, preserving authored transactions in a
private zero-balance manual ledger. Every complete snapshot advances the existing
consent revision; older account snapshots and transaction batches cannot restore
the removed data. Sync uses the returned revision for subsequent writes. Failed
provider reads do not imply an empty snapshot. No new database migration.

API260/260, TypeScript, PostgreSQL15/15, and real Plaid Sandbox3/3 pass. Database
cases cover empty/repeated selection, partner/manual preservation, stale snapshot
rejection and rollback when account ownership conflicts. Native Sync now removed
a seeded stale synthetic bank account and its $20 import while retaining a private
$7 manual entry. Cold launch showed unchanged $23,952.74 investment net worth and
$7 spending, with exact investment IDs preserved in independent readback. This
proves stale-account cleanup through native sync, not clicking deselect at a live
bank. [Evidence](evidence/2026-09-22/account-selection-cleanup.json).

Storage fell to ~200MiB during testing. Removed three stopped disposable database
clusters (retaining logs) and writable data layers of the stopped synthetic Android
emulator; ~3GiB became available. Active database, source, credentials and signed
artifacts preserved. Android test data will reinitialize; old evidence does not
claim the emulator still holds its former state.

Remaining: native OAuth, intended-client/hosted candidate parity, actual calendar
reminder delivery, live pricing/access/security and release gates. No production
deployment, paid activation or store submission occurred. Prior c65efda CI289
completed successfully; this new commit requires its own CI.

## September 22 — hosted account-selection candidate verified

CI290 (`35777068765`) passed all four jobs for `e985af8`. Deployed the committed
archive to the already-approved isolated API as
`c2fb95ea-9c6e-47e7-af23-d6e1382e33e8`; SUCCESS, ready health, four runtime source
hashes and explicit Sandbox/email-off/paid-AI-off checks pass. No new migration.

Actual Plaid-signed full-Item revocation and unsigned/invalid rejection pass on
this candidate. A separate guarded hosted test seeded a missing synthetic account
with an import and authored entry, then called real provider-backed sync. The
missing account/import were removed; its private $7 manual entry and exact
investment IDs/balances were preserved, including repeat sync. Both disposable
fixtures and provider Items were cleaned up. This is snapshot-reconciliation
evidence, not a live bank's deselect screen. Reproducible guarded scripts:
`test-hosted-signed-webhook.cjs` and `test-hosted-account-selection.cjs`.

`WORTHLANE_HOSTED_SANDBOX_APPROVED=true node scripts/test-hosted-sandbox.mjs --verify`
passed before deployment, after deployment, and after disposable tests: exact
53/396 ledgers, separate-login privacy, private $125.50 fallback, $2,450 agreed
responsibilities, saved zero-APR payoff plan and idempotent unpaid due-date handoff.
[Deployment evidence](evidence/2026-09-22/hosted-selection-cleanup.json).

This updates hosted API acceptance, not the frontend/native artifact versions.
Native OAuth, intended-client parity, calendar-time reminder observation and
separate live-provider/distribution preparation remain open. No production
deployment, paid plan/product activation, public release or store submission.

## September 22 — real calendar reminder prepared

Created a synthetic $1 bill through local API3101 with reminders off after
unreliable Simulator text entry was discarded unsaved. In the native Upcoming
editor, selected On due date and saved; native Saved confirmation showed no
permission/scheduling warning. Independent fresh API login readback confirms
exactly one active, unpaid bill due September 23 with DUE_DATE timing. Expected
trigger is September 23 at 9 a.m. Phoenix time. Keep this synthetic Simulator
session signed in for observation; logout cancels its device reminders.

This is preparation, **not observed delivery** or independent OS queue proof.
Evidence: `evidence/2026-09-22/calendar-reminder-preparation.json`. The temporary
local readback helper is `.tmp/calendar-reminder-readback.cjs`.

Also corrected Quick add's success copy when the selected reminder time has
already passed: it now explicitly says no reminder was scheduled, matching the
editor. `corepack pnpm --filter @worthlane/mobile typecheck` and `git diff --check`
pass. That new past-time message has not been interactively exercised. No new
build, production deploy, paid activation or store submission occurred.

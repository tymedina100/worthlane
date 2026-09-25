# Beta acceptance status — updated September 25, 2026

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
| Native standard connection | Current standalone iOS Simulator candidate `aced2d4e`, source `86001c0`, passed hosted Sandbox Betterment connect, repeat sync, cold launch, forced-expiration repair and UI unlink. Exactly two investments totaled $23,952.74 with zero spending/transactions and stable account IDs through repair. Unlink and restart returned to zero. Provider revocation is covered separately by integration tests. [Evidence](evidence/2026-09-23/ios-investment-artifact.json). |
| Investment OAuth / distributable parity | **Current iOS connect and cold launch pass.** A retry with visibly checked IRA/401k completed native OAuth, saved exactly two private investments/$23,952.74 and zero spending, and restored the same accounts after restart. Earlier failed attempt remains documented; no code changed. Repeat-sync timestamps and separate non-owner API denial now pass. Forced-expiration OAuth repair returned to login and provider ITEM_LOGIN_REQUIRED persists; unlink and Android/current-planning coverage remain. Android candidate finished and passed static checks; interactive coverage and store-build parity remain open. [Current iOS evidence](evidence/2026-09-23/ios-investment-artifact.json). |
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

## September 22 — preserve reminders when deletion fails

Found a native reliability defect during release review: Upcoming canceled the
local reminder before asking the API to delete the saved obligation. A failed
network/server request could therefore leave the obligation saved without its
reminder. Deletion now awaits API confirmation before canceling; native cleanup
failure reports Item deleted with a cleanup warning instead of reporting the
server deletion as failed. Late error/refresh callbacks are suppressed after a
login change. Foreground reminder reconciliation remains the cleanup retry.

Four failure-path tests execute the actual mutation callbacks with controlled
network/native adapters. They cover pending/failed deletion, confirmed deletion,
cleanup failure and login changes. They fail against pre-change source and pass
against this change. `corepack pnpm test:auth-privacy`:23/23 pass;
`corepack pnpm --filter @worthlane/mobile typecheck` and `git diff --check` pass.
The new tests are wired into existing CI. Interactive failure injection remains
unverified because the Mac is locked. The September23 calendar fixture was not
deleted or modified. Prior runtime402387e CI292 completed all four jobs
successfully; this new change needs its own CI. No production/store actions.

## September 22 — hosted investment connection and update verified

Fresh synthetic solo onboarding on the isolated hosted frontend completed without
an invitation. IAB Plaid Sandbox Betterment connection saved exactly IRA $320.76
and 401k $23,631.98, both Personal. UI Sync, reload and Reconnect/update-mode selection
completed. Fresh API login verified exact account/Item IDs and balances retained,
 $23,952.74 net worth, zero spending/transactions and INVESTMENT_BALANCES_ONLY.
CI 297 for 0849086 passed. No runtime source changed in this milestone.

Unlink is pending the IAB JavaScript confirmation; browser dialog APIs could not
observe/accept it, so user assistance was requested. Forced-expiration hosted
repair and OAuth are separate unresolved checks. Platypus OAuth did not open its
authorization window. Chrome remained blank after dismissing its storage notice;
4.9 GiB free, no browser data deleted. Evidence:
`evidence/2026-09-22/hosted-investment-ui.json`. No production/store action.

## September 22 — hosted investment OAuth and expired repair pass

Chrome recovered after toolbar reload. A fresh synthetic solo owner completed
Platypus OAuth Sandbox bank authorization, selecting only IRA and 401k. Returning
to Worthlane saved two Personal investment accounts totaling $23,952.74, with no
spending or transaction imports. A guarded helper inside the isolated Railway
service forced ITEM_LOGIN_REQUIRED only for this verified synthetic Item. UI Sync
showed Needs Relink while preserving balances. UI Reconnect repeated OAuth login
and simulated consent, returning to Healthy. Fresh API and hosted database/provider
readback verified identical account/Item IDs and balances, Investments-only product,
zero spending/transactions and no remaining provider error. Repeat sync and full
reload passed. UI unlink in Chrome removed all accounts/Items; fresh API readback
confirmed zero net worth, spending and transactions. Provider revocation after
unlink was not independently queried in this run.

Found and fixed inaccurate connection-error copy: investments now warn that saved
balances may be outdated, rather than claiming missing spending. Shared core tests
52/52, core typecheck and diff check pass. This copy change still needs hosted UI
verification after the approved isolated branch deployment. Evidence:
`evidence/2026-09-22/hosted-investment-oauth.json`. The prior IAB Betterment unlink
dialog remains separate; no native iOS OAuth, production or store claim.

## September 22 — deployed investment warning verified

Isolated API deployment `5d5bd98d-7ee4-49bf-bfb1-531fa221ccba` from `cd40dd9`
completed successfully. Ready health, runtime shared-core source hash and Sandbox
configuration passed; email and paid-AI keys are absent. CI300 succeeded.
The API and hosted browser now show the investment-specific stale-balance warning.
Exact two-account/Item IDs and $23,952.74 were retained with zero spending/imports.
The complete hosted two-login regression passed: 53/396-row ledgers, private
$125.50 manual fallback, $2,450 responsibilities, saved debt and idempotent due date.
Guarded API unlink removed the disposable Betterment connection; fresh readback
confirms zero accounts/Items/net worth/spending/transactions. This cleanup was
through the API, not browser unlink. The earlier stuck IAB confirmation was closed
and no longer requires Tyler. Native OAuth, final artifacts and actual calendar
reminder delivery remain open. No production or store action occurred.
Evidence: `evidence/2026-09-22/hosted-investment-warning.json`.

## September 22 — native launch race and dependency recheck

Repeated Connect bank/Connect investments/Repair taps could overlap token requests
and SDK session creation; SDK13.2.0 resets its global callbacks on each create.
A synchronous ref guard now prevents overlapping startup, with disabled/busy
controls and release on success, failure or a stale login. This guard ends after
native presentation; it is not a claim to manage the entire native session.
Tests execute the actual profile launch function. The old source produces three
requests instead of one; current tests pass for overlap during token/SDK creation,
token/presentation failure retries and a login change. Auth/privacy suite26/26
and mobile typecheck pass. Interactive rapid-tap verification remains pending.
This is a separately demonstrated race, not a proven cause or fix for OAuth.

Fresh production dependency audit still reports2high/4moderate, no criticals.
All four actual Metro-image/router-decoder mitigation tests pass. No advisories
were suppressed; caller limitations in dependency-security-status.md still apply.
Plaid documentation still cautions that Simulator Universal Links can fail:
https://plaid.com/docs/link/troubleshooting/. The installed session integration
uses the supported create/open API. Native OAuth remains unverified; no phone
access, SDK upgrade, production deployment or store submission occurred.

## September 22 — native launch guard interactive acceptance

Candidate b0bec35 passed all four CI302 jobs (35790783973). Laptop Simulator
interaction observed all three connection controls disabled/busy during startup,
then Plaid opened normally. Explicit cancellation restored enabled Settings. A
fresh second launch also opened Plaid; explicit cancellation and Maestro assertions
returned to Settings. Rapid concurrent-request suppression is separately proved
by the source-executing regression, not inferred from sequential UI taps.
The existing two investment accounts remained unchanged on the initial independent
readback; calendar OS read retained exactly one owner-matched September23 9am
Phoenix reminder. This is launch/cancel/retry acceptance, not OAuth completion.
Evidence: `evidence/2026-09-22/native-launch-guard.json`. PR20 remains unmerged;
no phone, production release or store submission.

## September 23 — signed Mac investment lifecycle verified

Exact signed Mac package completed hosted Sandbox Betterment investment connection,
sync, full reload, quit/relaunch with saved session, and UI unlink. Independent
fresh API readbacks retained exact two account/Item IDs, $23,952.74 net worth and
zero spending/transactions, then zero accounts/Items after unlink. Plaid offered
three accounts including cash management; Worthlane persisted only two investments.
The prior stale-window/session issue did not reproduce, but its cause remains
unproven. This is standard Link, not Mac investment OAuth or forced repair.
Evidence: `evidence/2026-09-23/mac-investment-lifecycle.json`.

The Mac restarted before September23 9am Phoenix and Simulator was shut down on
inspection at9:21. Its archive retained the exact overdue pending notification
and no delivered notification. Calendar delivery remains unobserved; this cannot
be counted as an on-time pass. Restore the laptop environment and schedule a new
real future check. Evidence: `evidence/2026-09-23/calendar-delivery-unobserved.json`.
No production change, paid build, phone access or store submission.

## September 23 — updated mobile Sandbox candidates queued

Authenticated Expo billing showed Free/$0 estimated bill, 8/15 iOS and 7/15
Android builds used. Started one included Android sandbox-preview APK build
(2a2aee67-deaa-4571-874b-2f57fb0f6e2a) and one iOS sandbox-simulator build
(aced2d4e-8af7-4324-9aab-ca977c115613), both from pushed source 86001c0.
Provider readback reports IN_QUEUE for both; they are not completed or installed.
No upgrade, payment, production configuration, store upload or submission.

CI306/35889254734 for that exact source succeeded. Sixteen focused mobile
release-configuration and native launch-state tests passed. Inspected the EAS
archive: 721 files, all 670 included tracked files match source, no private
environment files, fixture directory or signing exports. EAS reported no preview
environment variables; guarded Sandbox profile values and existing Android
signing credentials were used.

The original Simulator remains booted and signed in. Fresh API/OS readback still
finds exactly one owner-matched reminder for September24 09:00 Phoenix. Do not
replace that app/session before observation; use another Simulator for the new
artifact. Delivery remains unobserved. Next: inspect completed artifacts and
verify investment, banking recovery and persisted journeys. Native OAuth and
live provider requirements remain open.
Evidence: `evidence/2026-09-23/mobile-candidate-builds.json`.

## September 23 — signed Mac investment OAuth/repair and current iOS artifact

Signed Mac app completed real Plaid Sandbox OAuth in its isolated bank popup.
Only IRA/401k were selected; fresh API baseline confirmed two private investments,
$23,952.74 net worth and zero spending/transactions. A guarded provider reset
forced ITEM_LOGIN_REQUIRED. Native Sync showed Needs Relink and stale-balance
copy while preserving data. Interactive OAuth repair returned Healthy; independent
provider read confirmed no error and Investments-only product. Exact account/Item
IDs and balances survived repair, repeat sync and full UI reload.

UI unlink removed accounts/Item on the server (fresh API confirmed all zero), but
the Mac retained old balances and disabled controls until explicit Refresh planning
data. That refresh showed zero and the unlink confirmation. Do not count automatic
unlink reconciliation as passed; investigate this delay. No provider revocation
query was performed after this unlink. Evidence: mac-investment-oauth.json.

iOS build aced2d4e from86001c0 finished. Downloaded archive SHA256
6c973360580b4facb9299ec09134796f77ce104dc318ee078ac5be95a538015a; strict deep
signature passes, bundle com.worthlane.mobile/build7, embedded hosted Sandbox
origin and investment/launch-guard markers present. Not installed or UI-accepted.
Android2a2aee67 remains IN_QUEUE; its laptop emulator booted successfully. Keep
original iOS reminder Simulator intact. Evidence: ios-investment-artifact.json.
No production change, spending, store upload or submission.

## September 23 — current iOS artifact installed and saved journey read back

Installed completed aced2d4e/86001c0 build7 in a separate named Simulator
D9057EC1-22AE-4C7A-AD66-7E3409256EEB, preserving the original reminder device.
Actual Alex reviewer sign-in against hosted Sandbox showed private $1,500, zero
spending/income and the saved $25 bill. Household readback showed exact $600
groceries split300/300, $150 utilities assigned to Sam, and $1,700 rent1020/680.
Terminating/relaunching the exact bundle restored the signed-in dashboard without
credentials. Fresh screenshot verifies this; the post-launch accessibility tree
was empty and must not be treated as an app failure. Maestro dismissed the OS
Save Password sheet without saving test credentials.

Independent read-only verification still finds exactly one original owner-matched
September24 9amPhoenix notification. The Android emulator is booted, but remote
APK2a2aee67 remains IN_QUEUE at last provider read. Second-login, current-artifact
banking/mutations and native OAuth remain unverified. Evidence updated in
evidence/2026-09-23/ios-investment-artifact.json.

Mac follow-up: title/accessibility/rendered image disagree after sign-out; sampled
main and renderer processes are alive in event waits, not proof of a specific
deadlock. Screenshot retained older investment content while accessibility had
zero-account state. Preserve the open rendering/reconciliation issue; no speculative
source patch or claim of successful visual sign-out. Raw local process samples
remain .tmp/mac-main-stall-sample.txt and .tmp/mac-renderer-stall-sample.txt.
No production change, paid action or store submission.

## September 23 — current iOS second-login privacy and persistence pass

On installed aced2d4e/86001c0, Alex sign-out returned an empty email/password form.
Separate Sam login showed private $900, zero spending/income and no upcoming
items (Alex's $25 bill absent). Actual household view retained exact groceries
300/300, Sam-owned utilities150 and rent1020/680, with category editing restricted
to the owner. Cold terminate/relaunch restored Sam dashboard without credentials;
fresh screenshot confirms900/no upcoming bill despite an empty accessibility tree.
Maestro independently asserted900 and absence of Alex's bill after dismissing the
system password sheet without saving credentials.

Fresh API login checks confirm each reviewer has exactly their own account ID,
matching household245000minor, and no cross-owner bill/debt access (Sam404 for
Alex's plan). Full existing hosted regression also passed: exact owner53/partner396
transaction ledgers, no repeat-sync duplication, private125.50 manual fallback,
2450responsibilities, saved zero-APR plan and idempotent due-date handoff.
Evidence: current-reviewers-readback.json and updated ios-investment-artifact.json.

This closes current-candidate two-login readback/restart coverage, not its banking
lifecycle or fresh interactive mutations. Native OAuth, Mac stale rendering,
actual calendar delivery and release/provider gates remain. No production or store
action; current Simulator remains signed in as synthetic Sam.

## September 23 — current iOS investment lifecycle passes

Installed standalone Simulator build aced2d4e/86001c0 completed Betterment
Sandbox investment connect, repeat sync, cold launch, forced-expiration repair,
post-repair sync and UI unlink against the hosted Sandbox. Plaid offered IRA,
401k and cash management; server filtering retained exactly two investments
totaling $23,952.74, with zero spending/transactions. API comparisons preserved
exact account and Item IDs through sync and repair. Native restart restored the
saved balance without login.

Guarded Sandbox expiration produced ITEM_LOGIN_REQUIRED. Native Settings showed
Needs relink and the investment-specific stale-balance warning while retaining
balances. UI Relink completed; native Healthy and provider error-null/Investments-only
checks pass. UI unlink immediately showed Nothing linked yet; API confirmed zero
accounts, Items, transactions, spending and net worth. Another cold launch showed
the empty dashboard and household net worth0. This interactive run did not query
the revoked provider Item after unlink; separate integration evidence covers that.

Initial Betterment login reached App Password Required; erasing/retyping public
Sandbox credentials allowed completion. No root cause is claimed. A Finish without
saving selector timed out on the initial connection, but native Bank connected
and independent persisted API readback proved completion. Relink's same selector
passed. No real credentials, production data, paid action or store submission.

Evidence: docs/evidence/2026-09-23/ios-investment-artifact.json. The original
September24 reminder Simulator remains separate. Android2a2aee67 was freshly
IN_QUEUE this turn. Next: native OAuth, remaining current-artifact banking/planning
mutations, Android when ready, and Mac stale-rendering diagnosis.

## September 23 — Mac stale rendering reproduced and fixed in local package

The original signed package reproduced login navigation with a dashboard window
title but the old login page in both screenshot and accessibility. Raise/Tab did
not fix it; native window zoom immediately revealed the loaded dashboard.
The main Mac BrowserWindow now disables background throttling so frames continue
updating while covered. Windows retains its previous behavior. Existing software
rendering, sandbox, context isolation, origin pinning and packaged fuse settings
remain intact. Electron documents that this option controls frame drawing/swapping
as well as timers: https://www.electronjs.org/docs/latest/api/browser-window.

A fresh local ad-hoc package passed all23 native tests, syntax,9asset/8fuse checks
and strict deep signature verification. Interactive login, sign-out and account
navigation updated without resizing. Real Betterment Sandbox connect returned
automatically to2private investments/$23,952.74. UI unlink then automatically
removed balances and controls and displayed its confirmation, without Refresh
or resize. Screenshot and AX agreed; API independently confirmed zero accounts,
Items, transactions, spending and net worth. Evidence: mac-rendering.json.

Limits: local test package only; updated Developer ID package still needs build
and acceptance. Initial startup reached a timeout recovery page; normal Retry
restored the saved session, with no proven cause. Disabling background throttling
can increase rendering work while covered; battery impact was not measured.
Android2a2aee67 remains IN_QUEUE at fresh provider check. No production deployment,
notarization, paid service or store submission.

## September 23 — Developer ID rendering candidate verified; signing launcher fixed

Built bdb7e29 runtime with the existing Developer ID Application certificate
(team5FBXR5M5PJ), hardened runtime and timestamp. Strict deep verification and
9asset/8fuse package verification passed. The signed app.asar hash matches the
previously tested ad-hoc package exactly; all7runtime files match source. Cold
launch restored the saved disposable Sandbox dashboard without login or Retry.
Signed UI manual create42.17, edit43.17 and delete0 each updated automatically;
independent API confirmed values, zero spending/transactions and final cleanup.
Sign-out rendered an empty login form; screenshot and AX agree without resizing.
Signed-package banking was not rerun; identical archive parity and prior local
connect/unlink evidence are recorded separately in mac-rendering.json.

Found and corrected a distribution-script mismatch: our preflight requires the
explicit Developer ID Application label, but electron-builder rejects that prefix
in CSC_NAME. The new launcher validates the full identity, then supplies only the
builder-compatible name in the child environment. Ad-hoc/development/ambiguous
identities still fail validation. Target architectures, forced signing and
publish-never behavior are retained. All24native tests pass, including the new
identity-normalization regression; syntax and diff checks pass. Actual signed
packaging succeeded with the equivalent normalized identity. No notarization,
production deployment, paid action or store submission.

## September 23 — current iOS OAuth failure isolated and clean exit verified

Standalone aced2d4e/86001c0 build7 reached Platypus OAuth Bank mock login,
verification and final confirmation. After enabling and tapping the actual final
button, native Plaid displayed Couldn't connect to Platypus OAuth Bank. Text
selectors had earlier matched explanatory copy; fresh screenshot coordinates
resolved that automation error. IRA/401k labels were tapped, but their checked
states were not captured together, so this run does not prove final selection.

Yes, exit returned to usable Worthlane Settings with Nothing linked yet. Fresh
API readback confirms zero accounts, Items, net worth, spending and transactions.
The earlier same-artifact direct Universal Link opened Settings from Safari;
hosted API reports Sandbox and the expected HTTPS redirect, and SDK13.2 uses its
session API. These checks narrow the investigation, not prove the provider return
or a root cause. No speculative runtime patch was made. Next: inspect provider
session diagnostics and distinguish selection/auth failure from callback handling.

Android2a2aee67 remains IN_QUEUE at fresh provider check. Original reminder device
was not changed. Evidence: evidence/2026-09-23/ios-investment-artifact.json.
No production changes, spending, real-bank credentials or store submission.

## September 23 — current iOS OAuth connect and cold launch pass

Provider logs show prior attempt EXIT/REQUIRES_OAUTH; session debugger returned
Invalid request/No item found. Plaid documentation says this status can follow a
bank error or access not granted, so it does not establish a callback bug.
A bounded retry directly clicked IRA and401k checkboxes; fresh screenshot proved
both checked and neighboring accounts unchecked. Final mock confirmation returned
Plaid Success/two accounts, then Worthlane Bank connected/Healthy. Fresh API login
confirmed2INVESTMENT accounts,1Item,$23,952.74,0spending/transactions and
INVESTMENT_BALANCES_ONLY. Cold terminate/relaunch restored dashboard23952.74 and
zero spent/received without credentials; exact IDs/balances remained unchanged.

This supersedes current-candidate OAuth connection failure, not the full lifecycle.
No runtime code changed and the prior failure cause is unproven. Text selectors
were unreliable; final state and independent readbacks support acceptance. The
Sync every institution action was invoked, but timestamp advancement was not
independently compared. Keep the disposable Item for stronger repeat-sync proof,
forced-expiration OAuth repair, privacy and unlink. No actual-bank acceptance.

Android2a2aee67 completed. Downloaded APK SHA256
95a68eb02b896e4daa9e5a7c2c2b6f718f8fe3af1937aee43654dacab08d3ea3;
apksigner verifies the existing signer, packagecom.worthlane.mobile/version4,
and embedded hosted Sandbox origin/investment markers. Not installed/tested yet.
CI313 for c438a9a passed all4jobs (CI,PG17,PG18,Windows). Evidence:
ios-investment-artifact.json,android-investment-artifact.json,mac-rendering.json.
No production change, spending, store submission or reminder-device changes.

## September 23 — OAuth repeat-sync/privacy pass; repair remains open

Current iOS candidate native Sync every institution advanced both saved account
lastSyncedAt timestamps. Exact account/Item IDs,$23,952.74,0spending/transactions
and Healthy state remained unchanged. A separate Sam reviewer login could not list
these accounts/Item; update-token,targeted sync and unlink each returned404.
That login is in a different household; same-household privacy is separate evidence.

Guarded real Sandbox reset confirmed ITEM_LOGIN_REQUIRED with Investments-only
product. Native sync showed Could not sync/relink required and the investment
stale-balance warning; exact IDs and balances remained intact. Native Relink then
completed mock login/verification, visibly checked IRA/401k and final confirmation,
but returned to Plaid's login prompt. Provider readback confirms ITEM_LOGIN_REQUIRED
still present. No successful repair is claimed. Yes, exit returned usable Settings
with the warning and unchanged balances. Keep this disposable expired connection
for a controlled comparison in the finished Android candidate before unlinking.

Evidence: ios-investment-artifact.json. No runtime patch, production action,
spending, store submission or original-reminder Simulator change.

## September 23 — Android candidate installed; manual fallback lifecycle passes

Installed signed APK2a2aee67/source86001c0/version4 in laptop emulator5554.
Existing disposable hosted Sandbox login showed23952.74 and0spending/income;
force-stop/start restored session and balances. Settings shows same2investments,
Needs relink and honest stale-balance warning. Relink opened Plaid and bank
Continue to login reached Chrome first-run Terms of Service. Scoped confirmation
requested; still pending. No Android OAuth repair outcome is claimed.

Independent work: native manual Checking account Android manual acceptance
created42.17 (netWorth23994.91), edited43.17 (23995.91), persisted after cold launch,
then deleted through native confirmation. UI refreshed and API independently
confirmed every aggregate and final exact original2investment/Item baseline,
23952.74,0spending/transactions,NEEDS_RELINK. This proves current-artifact manual
fallback mutations while retaining the expired OAuth fixture for comparison.

Evidence: android-investment-artifact.json. Original reminder Simulator preserved.
No production action, new paid service, real-bank credentials or store submission.
Next: Chrome confirmation for Android repair, or independent remaining planning
and separate-login checks while that input is pending.

## September 23 — Android upcoming lifecycle and bounded storage cleanup

Current Android86001c0 candidate created a synthetic150 bill due2026-09-25 via
Quick add. Native Saved and Upcoming exact date/amount agree with fresh API;
reminderTimingNONE. Native Paid moved it to Recently paid, APIisPaid/statusPAID.
Force-stop/start preserved signed-in session and Recently paid card. Native Unpaid
restored Upcoming/APIisPaidfalse. Separate Sam reviewer cannot list this obligation
(different household). The final post-toggle ledger helper receivedHTTP429 on fresh login, so that
recheck is pending cooldown; prior baseline is not a final ledger proof. Retained unpaid test bill for later edit/privacy coverage. This
is not actual calendar reminder delivery, date editing or deletion acceptance.

Removed668MiB logical obsolete test binaries/download cache: duplicate ad-hoc Mac
package (ASAR identical to retained signed candidate), old iOS recovery extraction
(archive kept),2superseded Android APKs and Electron download ZIP. Executable-path
guard confirmed none running; source,credentials,current artifacts,logs/screenshots,
SDK/AVD and reminder Simulator retained. Free space2.5→3.1GiB. Exact manifest:
evidence/2026-09-23/storage-cleanup.json. Native evidence:android-investment-artifact.json.

Chrome terms confirmation remains pending for Android OAuth comparison. iOS OAuth
repair, remaining current planning/separate-login coverage, calendar observation,
live-provider and distribution gates remain. No production/spending/store action.

## September 23 — Android bill edit, persistence and deletion pass

Current Android86001c0 native editor changed the synthetic bill from150 dueSept25
to175.25 due2026-09-26. Saved confirmation followed by force-stop/start restored
the session and exact Upcoming card. Fresh API verified amount/date, unpaid active
BILL/reminderNONE; separate Sam reviewer cannot list the obligation (different
household). Native Delete confirmation yielded the empty Upcoming screen; fresh
API confirms the saved ID absent and zero upcoming items.

After both edit and deletion, independent API reads confirm exact original two
investment accounts/Item,23952.74netWorth,0spending/transactions,NEEDS_RELINK and
INVESTMENT_BALANCES_ONLY. This resolves the earlier rate-limited final ledger
check. The synthetic bill is removed; expired OAuth fixture is retained.
Evidence: evidence/2026-09-23/android-investment-artifact.json. No app code change,
production action, spending or store submission. Original September24 09:00Phoenix
reminder Simulator untouched. Next: remaining native debt/separate-login checks,
OAuth repair comparison after pending Chrome terms approval, scheduled reminder
observation and live-provider/distribution gates.

## September 23 — Android saved debt-plan lifecycle passes

Current Android86001c0 created a synthetic avalanche plan starting2026-09,
monthly budget100, current balance1000, statement800, minimum25, APR0 and
confirmed due2026-09-27. Native Saved shows payoff2027-06,0interest,total1000,
first payment100. Independent API asserts all distinct input fields and the
10-month schedule. After force-stop/start, signed-in Goals→Debt payoff→Open
restored the same saved estimate. Separate Sam reviewer cannot list/read it
(direct ID404; different household). API netWorth23952.74,0spending/transactions.

Assumptions remain visible, no payments are made. Synthetic plan retained for
strategy edit and idempotent minimum-to-Upcoming checks. First unsaved draft was
discarded after automation back navigation; re-entry used keyboard-state guards.
Evidence: evidence/2026-09-23/android-investment-artifact.json. No runtime code,
production, paid service, store or original-reminder Simulator changes.
Next: native strategy/due handoff and separate-login checks; existing OAuth repair,
calendar observation and provider/distribution gates remain.

## September 23 — Android strategy editing and duplicate-safe due handoff

Current Android86001c0 switched the saved plan to Snowball and saved. Native Saved
and explanation agree with fresh API SNOWBALL; distinct1000current/800statement/
25minimum/0APR and100budget persist, estimate2027-06/0interest/1000total unchanged.
First native minimum-to-Upcoming handoff created exactly one25 obligation due
2026-09-27 with reminderNONE. Full first API check also passed ledger and separate
reviewer plan privacy. Second native handoff still yields exactly one unpaid25
obligation with same due date/reminderNONE; Manage Upcoming displays one card.
Later checks in that second helper hitHTTP429, so do not claim a complete repeated
privacy/ledger pass. Retain synthetic saved plan/obligation for persistence/cleanup.

Evidence: evidence/2026-09-23/android-investment-artifact.json. Single zero-APR
debt verifies native strategy persistence, not multi-debt ordering (tested separately).
No code, production, spending, store submission or original-reminder device change.
Next: remaining separate-login/persistence coverage; OAuth repair comparison,
actual scheduled reminder observation, provider/distribution gates remain.

## September 23 — failed OAuth repair provider diagnostics

Authenticated Plaid Developers Logs now inspected for the specific11:21:37AM
repair exit, not the earlier create failure. It reports EXIT/onExit and
REQUIRES_OAUTH, Sandbox/ins_127287. The exact session debugger again returns
Invalid request / No item found. Session/request references are retained in
ios-investment-artifact.json; no credentials copied.

Code review confirms update mode derives investment scope from the owned saved
Item, omits create products, supplies access token/account selection and the iOS
redirect. Official update-mode/OAuth docs support this flow; account-selection
enablement is not evidence of a defect. No speculative runtime patch made.
Next: controlled same-expired-Item comparison on another client; Android Chrome
terms confirmation remains pending. Native persistence/calendar/provider/release
gates remain. Storage2.7GiB free; no large build started. No production changes.

## September 23 — Android account switching and partner plan readback

After cold restart, the first synthetic login retained exactly one25 minimum
obligation dueSept27. Native Sign Out confirmation cleared to empty credential
form. Native Sam reviewer login then showed900 net worth/0activity, empty Upcoming,
only Sam review checking900 in Settings and no saved debt plans. Prior investment
fixture data did not carry across accounts (different household).
Sam household view shows visible netWorth900, groceries600→300each, utilities150
assigned entirely toSam, rent1700→Alex1020/Sam680, and owner-management plus
responsibility/payer/privacy explanations. Existing same-household fixture evidence
provides the other private balance; this native view does not expose it.

Evidence: evidence/2026-09-23/android-investment-artifact.json. No extra API login
helpers run; earlier second-helper throttled check is not reclassified. Android
now signed in as Sam. First fixture's plan/obligation and expired OAuth Item remain
for further checks; original reminder Simulator untouched. No production/spending
or store submission. Next: controlled OAuth comparison, reminder observation,
remaining release/provider gates and fixture cleanup.

## September 25 — interruption recovery and reminder outcome remains unverified

Resumed after interruption. Git clean at5934e4e; prior Maestro handle97229 is
missing and no simulator was booted. No result inferred from the interrupted
iOS repair attempt. Original reminder Simulator D7C7C0D2 booted successfully.
Read-only OS archives before/after boot show the September24 09:00Phoenix
notification still pending and no delivered entries. Neither on-time nor overdue
delivery is proved; shutdown timing is unknown. Original app/login/fixture was
not launched, changed, logged out or rescheduled. This replaces any future-tense
plan to observe September24 with an explicit incomplete result.

Storage dropped to146MB free during recovery. With no active compiler/build
process, removed only748MiB Xcode intermediate files and622MiB npm content cache;
free space recovered to1.46GiB. Preserved source, built app products, dependency
checkouts, credentials, simulator state and evidence. Exact evidence/manifests:
evidence/2026-09-25/calendar-reminder-recovery.json and storage-cleanup.json.

No production, spending, store action or successful OAuth repair claimed. Next:
complete controlled native OAuth comparison; establish a fresh bounded reminder
observation without repeating an unattended overnight assumption; remaining
provider/distribution gates stay open.

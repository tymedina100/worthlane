# Worthlane completion audit — September 18, 2026

Goal remains active. This is an evidence reconciliation, not a new claim that every
journey has been replayed or permission to publish. The requirement matrix below
retains the original brief and added website, Mac, production-preparation and store
scope. No physical-phone work or store submission is authorized.

On September18, `git ls-remote` confirmed main at `4b22bec` (approved PR19 merge).
PR18 and PR19 are merged, not pending drafts. Earlier approved rollout evidence is
recorded in production-preparation.md; this audit does not freshly verify deployment
health. The unmerged `codex/hosted-sandbox-acceptance` branch adds isolated hosted
Sandbox tests and evidence through `311f127`, not a production app change.

The separate approved hosted Sandbox runs candidate `4b22bec` with its own database,
Sandbox credentials and disabled email/paid AI/analytics. September18 fresh API
checks and separate browser logins prove persisted responsibilities, private manual
accounts, saved debt math and duplicate-free due-date handoff. See
[hosted-sandbox.md](hosted-sandbox.md) for exact scope and failures. Native hosted
login succeeded; native provider consent/import remains unverified. Historical
local native Link evidence must not be substituted for hosted release acceptance.

| Requirement | Audited evidence | Result / limit |
| --- | --- | --- |
| Reconcile stale instructions; preserve architecture | Current AGENTS.md, PRODUCT_PRINCIPLES.md, README.md and CLAUDE.md give September8 couples scope precedence; monorepo/mobile/desktop/shared API retained. Historical streak code is explicitly compatibility only. | Verified direction; legacy reference text is not a new product requirement. |
| Solo and consenting two-login onboarding, invitation before registration, max2 | PostgreSQL household test registers users, replaces invitation, denies data before acceptance, rejects third member, disconnects Prisma and logs both users in again. Recorded Jamie registration/manual journey and Morgan/Avery invitation then separate native logins supplement it. | Core persistent and interactive evidence recorded. Families use the same one/two-adult household model. |
| Owned/equal/custom category budgets and exact fixtures | Inspected integration assertions:600 gives300/300,150 assigned to partner,1700 gives1020/680; total2450 counted once. Tests include odd cents/refunds/privacy/history/month boundaries. Android actual60/40 save rejects110%, persists600.01 as360.01/240 across second login, retains2 history versions. | Verified implementation plus mutation/readback evidence; exact fixture arithmetic has database-backed coverage. |
| Responsibility independent of payer and account visibility | Household tests and shared financial rules; native split editor explains month recalculation/history. Fresh Avery view exposes4 permitted accounts versus Morgan17. Bilateral match/revoke interactions and exact totals recorded in beta-progress. | Verified privacy-filtered totals. Personal and household-viewer totals intentionally differ. |
| Plaid connect/reconnect/sync/error/unlink | Real Sandbox provider integration plus desktop/iOS/Android interactive evidence. Android repair kept16 account/545 transaction IDs; selected unlink returned provider ITEM_NOT_FOUND and retained OAuth/manual2 accounts/151 transactions. Updated web BFF popup exchange/repeat sync preserves3 account/201 transaction IDs. | Recorded Sandbox lifecycles pass. Full-page web create/return, expired-session recovery and repeat sync passed in 989828f: four account IDs and 226 transaction IDs remained unchanged after sync. Update-mode resume has separate automated coverage. |
| Transaction reconciliation and duplicate prevention | Inspected PostgreSQL tests cover added/modified/removed/pending-to-posted, transfers/card repayments, private manual/import review, bilateral joint matching/revocation and solo duplicate feeds. Repeat native sync retained unique IDs. | Covered by persisted tests plus relevant interactive flows. |
| Card fields, Liabilities and manual fallback | Real run-plaid-integration provider test recorded statement/minimum/due fields and nonowner isolation; route uses owned account allowlist. Desktop/native manual card fields and saved due dates recorded; predictions are labeled estimates. | Sandbox/manual evidence present. Production Liabilities is not enabled; manual fallback remains required there. |
| Reliable reminders and saved debt estimates | Actual iOS/Android background test notifications; DATE diagnostic aligns with obligation trigger type. Adapter tests cover local9am/date/session reconciliation. Shared debt tests explicitly cover promo-day proration, zero APR, minimum shortfall, non-amortization and cents. Saved two-login debt readbacks recorded. | Core evidence present; actual9am/physical-phone delivery is not claimed. Phone use excluded by user. |
| Aesthetic app/site and beta list | Native forest/cream screens and improved recovery controls; approved live website and persisted consent-based waitlist proof recorded. | Website request delivered. Android notification icon rebuilt and inspected in the installed APK; actual delivered banner remains unverified. Five native screenshot drafts exist; final store imagery/artifact parity remains. |
| Regression assurance / commits / project updates | PR16 and PR17 merged and deployed under explicit approval; both main CI runs passed all four jobs. Atomic reset concurrency, bounded email delivery and web recovery have persisted/local and hosted acceptance evidence. Commits are pushed and milestones tracked in Notion. | Email delivery and hosted recovery are complete. Signed native artifact parity remains open. PR18 service isolation and PR19 deletion tests were approved and merged; hosted tests/evidence remain on a separate pushed branch. |
| Truthful diagnostics and privacy disclosures | API error allowlist strips request/user/context and raw exception details. Mobile uses filtered JavaScript errors with native diagnostics and automatic sessions disabled; enabled/disabled configuration tests and three-platform exports pass. Store collection matrix is source-backed. | Fresh native launch on isolated Metro8084 passed after Simulator relaunch; persisted dashboard data rendered. Final store privacy answers must match the signed artifact and enabled services. |
| Added native Mac app | Installed standalone Electron app; persisted Morgan/Avery household, native menus, quit/relaunch and isolated offline/retry UI verified. 19 tests, 8 asset and 8 fuse checks, strict local ad-hoc signature. User completed macOS Keychain prompt, after which saved-session cold launch reached household directly. | Earlier local saved-session evidence remains valid for that build. A later standalone Hosted Beta Mac build points at the deployed planning client; its login/recovery/cold-launch checks passed, but authenticated hosted Mac acceptance is not established. Public signing/notarization remains pending. |
| Added production Plaid/store preparation request | App record and partial copy saved earlier; Android registration saved. Plaid/Apple/Railway sessions restored. Transactions/Balance enabled and billing verified; Liabilities not enabled. Apple review notes/contact/keywords saved. Existing Railway API/Postgres located. Signing/privacy/screenshots/reviewer access and hosted release verification remain. | Incomplete. Do not submit. |

## Remaining acceptance gates

| Gate | Evidence required to close it | Current limitation / next action |
| --- | --- | --- |
| Hosted native banking | Finish actual Link/OAuth return, saved account/import readback, relink, repeat sync with stable IDs, cancellation and selected unlink; verify other login/manual rows survive. | Native Link opens but provider controls were inaccessible to Computer Use. In-app web provider Documents returned ERR_BLOCKED_BY_CLIENT while token/SDK requests succeeded. No hosted native link completion claimed; do not bypass browser protections. |
| Hosted native planning and reminders | Reopen both saved logins, confirm personal/shared totals and private debt/bill views, and observe a scheduled reminder from the current client with cancellation/session isolation. | Hosted native Avery login, saved $125.50 account, $42.75 bill due September21 and persisted one-day-before preference pass with fresh API cross-user denial. A fresh native DATE diagnostic reached OS notification history. Native logout/relogin retained the bill and cleared the earlier diagnostic history;15/15 mocked adapter tests pass. Actual future bill delivery and direct pending-queue inspection while signed out remain unverified; final artifact parity remains separate. |
| Current distributable artifacts | Build/sign the intended beta configuration, verify its API/feature flags, replay core journeys on it, and match screenshots/reviewer accounts to that exact build. Isolated packaged Mac authenticated cold launch now passes with a local frontend and hosted Sandbox API; fully hosted frontend acceptance and public Developer ID/notarization remain. | Existing native store builds predate the candidate. A development bundle is not final artifact parity. No paid EAS build or store submission is authorized. |
| Truthful service/privacy setup | Verify enabled diagnostics in the intended artifact, match Apple privacy answers and retention/scrubbing settings, and substantiate each required Plaid security claim. | Sentry IP storage prevention was off in both projects at last inspection; approval to enable is pending. Crash-data disclosure and content-rights confirmation remain unfinished. Fifteen Plaid attestations lack sufficient evidence; preexisting zero-trust attestation was not verified by this work. |
| Store preparation, without submission | Complete accurate privacy/reviewer metadata, fresh screenshots and candidate attachment; verify Google Play access/signing and leave release unsubmitted. | Apple remains a preparation draft at last inspection. Some copy, review contact, screenshots, Finance category and age answers are saved; no current build/reviewer credentials or completed privacy publication. |
| Final acceptance and authorized publication | Reconcile each brief requirement against current candidate evidence, run required CI, push reviewable commits, and obtain scoped approval for any resulting production deploy. | Core tests/local interactions are substantial; the gates above remain open. Pushed hosted evidence is not yet merged. Monitor the approved additional Railway budget (up to $10/month, not a provider hard cap). |

## Resolved or historical blockers

- Capital One showed **Enabled** in the September15 Plaid institution audit; the
  earlier “In review” statement is historical. Recheck provider state before live
  activation. Transactions/Balance were enabled; Liabilities/recurring/refresh were
  not enabled. Do not describe an unenabled product as permanently ineligible.
- PR18 and PR19 were approved and merged. PR15's additive migration/backups and
  later email rollout are recorded as completed, not awaiting another approval.
- Workspace support delivery/authentication, Resend domain/TLS and approved reset
  tests passed. Do not repeat outbound tests without a reason and matching scope.
- Families use up to two consenting adult logins; no child accounts are implied.
- Forecasting and gamification are not completion work. Responsibility is not a
  transfer or debt between partners. Manual fallbacks remain necessary.

Source: current [Notion brief](https://app.notion.com/p/3d57f32d407581d9a9eafcdb4d5ac152).
Exact chronology and test commands: [beta-progress.md](beta-progress.md).

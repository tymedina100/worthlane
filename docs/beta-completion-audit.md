# Worthlane completion audit — updated September 22, 2026

Goal remains **active**. Original couples/solo beta journeys have substantial
persisted and interactive evidence. Added investment balances now pass local
browser and standard native Sandbox lifecycles, while investment OAuth and
release parity remain open. Mac Developer ID signing is complete for the recorded
package; notarization is not. Apple build 30 is uploaded and attached to a saved,
unsubmitted draft, but predates investments.

This is a reconciliation of dated evidence, not a fresh replay of every journey
or a live deployment/provider audit. The matrices distinguish the original brief,
added product work and distribution/provider requirements. Work remains
laptop-only. No App Review submission or public release is authorized.

## Evidence baseline and scope

The September 22 main recheck recorded `4b22bec` after approved PR19; PR18 and PR19
are merged. PR20 / `codex/hosted-sandbox-acceptance` contains subsequent hosted
Sandbox, native, security and investment changes and remains unmerged in the
recorded state. Earlier approved production rollout details are in
[production-preparation.md](production-preparation.md). Do not infer current
production health or current deployed SHA from this document.

The isolated hosted API, hosted planning frontend, local development servers and
native binaries have different versions. September 18 hosted two-login checks,
September 21 frontend session fixes, September 21 release artifacts and September
22 local investment checks are separate evidence. In particular, the new local
investment path is not established as deployed to the hosted Sandbox or included
in store build 30.

## Original brief and added website/Mac requirements

| Requirement | Audited evidence | Result / limit |
| --- | --- | --- |
| Reconcile stale instructions; preserve architecture | AGENTS.md, PRODUCT_PRINCIPLES.md, README.md and CLAUDE.md give the September 8 couples scope precedence; monorepo/mobile/desktop/shared API retained. Historical streak code is compatibility only. | Legacy loss-aversion/streak wording is not a new product requirement. |
| Solo and consenting two-login onboarding, invitation before registration, max two | PostgreSQL tests register users, replace invitation, deny access before acceptance, reject a third member and reconnect/log in again. Recorded Jamie solo/manual and Morgan/Avery invitation/native journeys are supplemented by dedicated Alex/Sam hosted reviewer checks. | Core persistent and interactive evidence recorded. Families use the same one/two-adult household model. |
| Owned/equal/custom budgets and exact brief fixtures | Database assertions verify $600 → $300/$300, $150 assigned to partner and $1,700 → $1,020/$680; total $2,450 counted once. Cents/refunds/privacy/history/month boundaries covered. Actual Android 60/40 edit rejects 110% and preserves $600.01 → $360.01/$240 across logins with two history versions. September 21 native reviewer screens show the exact brief fixtures. | Implementation, mutation and fresh-session readbacks recorded. |
| Responsibility independent of payer and account visibility | Shared financial rules and household tests; native split editor explains recalculation/history. Separate logins expose only permitted accounts. Bilateral match/revoke interactions and exact totals are in the progress log. | Personal and household-viewer totals intentionally differ; responsibility is not a transfer/debt between partners. |
| Plaid banking connect/reconnect/sync/error/cancel/unlink | Real provider tests plus separate browser, Mac, iOS and Android interactions. Hosted Android OAuth import/repair/selective unlink and iOS standard Link/import/repair/selective unlink preserve exact original/manual/partner IDs and revoke the selected provider token. Web popup and full-page create/return/recovery/repeat sync have recorded proof; update-mode resume has separate tests. | Recorded Sandbox banking lifecycles pass within their named artifact/surface. Later hosted iOS Simulator OAuth remains unverified; historical local iOS OAuth does not substitute. |
| Transaction reconciliation and duplicate prevention | PostgreSQL covers added/modified/removed/pending-to-posted, transfers/card repayments, private manual/import review, bilateral joint matching/revocation and solo duplicate feeds. Complete ledger/ID comparisons supplement repeat native sync. | Persisted tests and relevant interactive flows recorded. |
| Card fields, Liabilities and manual fallback | Real Sandbox tests record statement/minimum/due fields with an owned-account allowlist. Desktop/native manual current/statement/minimum/due fields persist; recurring predictions are labeled estimates. | Production Liabilities is not enabled in the September 22 check; manual fallback remains required. |
| Reliable reminders and saved debt estimates | Actual iOS/Android DATE diagnostic notifications reached OS presentation/history. Adapter tests cover date/local 9am/session reconciliation; Android queued-alarm and delivered-history removal on logout were observed. Shared debt tests cover zero APR, promo-day proration, shortfall, non-amortization and cents. Native/browser separate-login plan and due-date handoff readbacks recorded. | Test delivery, persistence and cancellation have evidence. Actual future calendar-time/9am delivery remains unobserved. Phone delivery is outside the user-authorized scope. |
| Aesthetic app/site and beta list | Approved live redesign and persisted consent-based waitlist verification; forest/cream native screens, recovery controls and planning layouts inspected. Android notification icon inspected in an installed APK and actual notification shade. | Website request delivered. Store draft has four refreshed screenshots; investment UI is newer than those images/build 30. |
| Regression assurance, pushed commits and project updates | Approved PR16–19 rollouts and tests are recorded. Email reset concurrency/delivery and browser session recovery have persisted/local/hosted proof. PR20 milestones are pushed and tracked in Notion. Full CI `35765231000` at `36ef044`: all four jobs passed. | Does not claim latest-HEAD CI. Local investment regression: 199 API tests, 13 PostgreSQL + 3 real Sandbox tests; native coverage wording has passing typecheck. Current work requires its own final checks. |
| Truthful diagnostics/privacy | API strips user/request/context and raw exception details; mobile filtered JS diagnostics disable native diagnostics/automatic sessions. Exact store 30 and isolated Sandbox API telemetry were checked disabled September 21. | Apple privacy draft has six functionality data types, saved/reloaded but unpublished. This is candidate configuration evidence, not historical-data deletion or organization-wide attestation. |
| Native Mac app | Local menus/offline/retry/saved household, packaged hosted banking lifecycle, session expiry and selected unlink are recorded. September 22 personal-team Developer ID package passes strict signature/runtime/timestamp/assets/fuses and authenticated Alex cold launch after Keychain authorization. | Signing is complete for that package; notarization/publication is not. Earlier initial stale-frame/recovery causes remain unproven even though later cold launches passed. New investment UI is not verified in this signed package. |

## Added investment scope — September 22

Tyler specified Chase, Wells Fargo, Desert Financial and both checking and
brokerage/retirement at Charles Schwab. The new investment path records account
balances for net worth, separate from spending. It does not implement holdings,
trades or investment performance.

| Check | Dated evidence | Result / limit |
| --- | --- | --- |
| Product-aware connection and sync | Separate banking/investments Link purposes; Investments-only requests do not initialize Transactions. Sync trusts initialized products from Plaid, filters to investment accounts, avoids spending sync/refresh and uses `INVESTMENT_BALANCES_ONLY` freshness. Production requires explicit `PLAID_INVESTMENTS_ENABLED=true` plus valid live callback configuration. | Implemented on PR20; subsequent revocation protection adds the consentRevision migration, applied only to local/hosted Sandbox. No production activation. Configuration validation checks shape/presence, not DNS, allowlists, valid credentials or delivery. |
| Persistence, ownership and unlink | 13 isolated PostgreSQL and 3 real Sandbox tests pass, including stable investment IDs, zero spending rows, no Transactions initialization, other-login denial and provider `ITEM_NOT_FOUND` after unlink. | Backend Sandbox evidence; not actual Schwab account acceptance. The current focused Sandbox regression/typecheck also passes forced expiration, `NEEDS_RELINK`, retained account IDs/balances/lastSyncAt and owner-only update-token creation without Transactions, spending rows or cross-login leakage. State remains pending actual reauthentication: this is repair preparation, not completed reconnect. |
| Browser lifecycle | Native Chrome local UI connected private IRA $320.76 and 401k $23,631.98, totaling $23,952.74 with zero spending rows. Repeat sync, reload, fresh sign-in and UI unlink passed; independent PostgreSQL confirmed two accounts before and zero accounts/Items after. [Evidence](evidence/2026-09-22/investment-browser.json). | Browser standard flow passed. In-app browser frame stayed blank and reached bounded retry; Chrome completed. No browser investment OAuth claim. |
| Native standard lifecycle | EAS development Simulator `95061ba9` with the current Metro bundle showed Healthy/two investment accounts, repeat sync, persisted $23,952.74/zero spending/income after restart, then zero after unlink and another restart. API and PostgreSQL confirmed final zero accounts/Items/transactions. [Evidence](evidence/2026-09-22/investment-native-standard.json). | Passed on local laptop Simulator. UI run independently checked local deletion; provider revocation is separate integration evidence. Not store-build, Android or physical-device proof. |
| Native investment OAuth | First Platypus App2App returned from Safari to native Plaid, then looped to Continue to login without exchange. Checkbox selection was not independently verified. A later retry was interrupted by storage exhaustion. | **Not passed.** A fresh retry visibly checked IRA/401k, completed mock-bank authorization, then reproduced Continue to login without exchange. Clean exit returned usable Settings; fresh API read retained zero accounts/Items. Filtered events ended in EXIT without an error code. [Retry evidence](evidence/2026-09-22/investment-native-oauth-retry.json). No cause is proven; storage does not explain the earlier loop. |
| Provider availability and cost | September 22 read-only dashboard recorded Chase/Schwab OAuth Enabled; Wells Fargo and Desert Financial support panels list Transactions/Balance. Transactions and Balance enabled; Investments/Liabilities not enabled; Compliance Center Action required. | Actual live connections, Investments entitlement/pricing and scoped activation/rollout approval remain open. Institution support is not account-specific acceptance. |

## Dated artifact and deployment evidence

This table supersedes earlier “signing pending,” “not uploaded” and “current API
4b22bec” summaries. It is not a live inventory. Historical failed/replaced builds
and exact hashes remain in the linked evidence and progress chronology.

| Surface / check date | Artifact or source | Verified scope and remaining limit |
| --- | --- | --- |
| Hosted browser/Mac, September 21 | Frontend session changes `f294826`/`78823cd` and deployed `cd03cc9` recorded in progress/hosted logs | Parallel refresh-token recovery and cross-tab logout clearing passed. Hosted Mac forced repair retained 14 accounts/390 transactions, selected unlink revoked provider access and two-login verification passed. Do not infer today's alias/API version without a fresh check. |
| Hosted Android banking, September 18 | `22734e79`, source `1dd2196` | Chase OAuth/import/repeat sync, forced repair, selected unlink, privacy preservation, DATE reminder and logout alarm/history cleanup passed. |
| Hosted iOS banking, September 18 | `eb664bae`, source `1dd2196` | Standard Link/import/repeat sync/forced repair/selective unlink/provider revocation and DATE reminder/history cleanup passed. Chase OAuth attempts failed without adding data; Simulator OAuth remains open. |
| iOS planning/reviewer recovery, September 21 | `1fbc6a09`, source `b61b36c` | Strict signature/Sandbox endpoint/recovery markers; saved session/layout, Alex/Sam private $1,500/$900 views, exact responsibilities, saved private bill/debt and cold launch passed. At that artifact check native startup-failure Retry injection was not observed. September22 development-client read-failure/Retry/restored cold launch now passes separately; it is not store-format execution. [Evidence](evidence/2026-09-21/ios-recovery-artifact.json). |
| Android planning/reviewer recovery, September 21 | `e474ea38`, source `74c6bbf` | Existing signer/Sandbox endpoint/recovery markers verified; installation, Alex/Sam isolation, exact allocations and authenticated cold launch passed with no crash/ANR in that check. No new banking replay or established cause for earlier emulator ANRs. [Evidence](evidence/2026-09-21/android-recovery-artifact.json). |
| Apple store-format Sandbox, September 21 | Build 30 / `e47249aa`, source `74c6bbf`; Apple ID `2208b168-2933-459e-b64f-0f16400262f1` | Strict signature, approved team/profile/Associated Domains, Sandbox endpoint and 14 matching privacy manifests verified. Approved upload processed; exact build attached, saved/reloaded in Prepare for Submission with manual release. Predates investment implementation; no physical-device execution or App Review submission. [Archive](evidence/2026-09-21/ios-store-30.json), [upload/draft](evidence/2026-09-21/ios-store-30-upload.json). |
| Signed Mac, September 21–22 | Source `d1bf933`, `.tmp/mac-signed-sandbox-20260921/mac-arm64/Worthlane.app` | Developer ID/hardened runtime/timestamp/assets/fuses pass; signed-package Alex cold launch preserves private $1,500 and $2,450 plan with Sam private account absent. Not notarized/published; not a replay of every signed-package journey. [Evidence](evidence/2026-09-21/mac-developer-id-signing.json). |
| Local investment Simulator, September 22 | Development build `95061ba9-de4d-485a-a828-df072e9b57d2` with current Metro bundle | Proper development modules, guarded local API/Sandbox settings and disabled telemetry/AI/paywall. Standard investment lifecycle passed. OAuth retry reproduced the incomplete return; cannot substitute for hosted/store artifacts. |

The earlier codesign-only Simulator read was incomplete. Mach-O entitlement
inspection later found the approved app identifier and `applinks:worthlane.app`.
This rules out that specific missing-entitlement hypothesis, not all OAuth causes.
[Native parity audit](evidence/2026-09-21/native-banking-parity-audit.json) records
the correction and Plaid's documented Simulator Universal Link limitation.

## Remaining acceptance and release gates

| Gate | Evidence needed / next action | Boundary |
| --- | --- | --- |
| Native OAuth and added investment coverage | Finish a diagnostically observed investment OAuth attempt with verified account selection, successful exchange, persisted balances, sync/restart/privacy/unlink. Reconcile updated hosted iOS banking OAuth separately. Verify investment behavior on each intended supported client and deployed candidate. | Current attempt is not a pass. Laptop-only testing cannot establish physical-device OAuth readiness. |
| Intended candidate and hosted parity | Choose the intended beta source, verify its deployed configuration/artifacts and required CI, and reconcile new code against prior banking/planning evidence. Local native read-failure/Retry and restored cold launch now pass; [evidence](evidence/2026-09-22/native-startup-retry.json). | Store 30 and signed Mac do not contain proven investment parity. Local standard success is not hosted release acceptance. |
| Calendar-time reminders | Observe a persisted obligation's actual scheduled calendar-time delivery, then verify edit/cancellation/session isolation as needed. | DATE diagnostic delivery and adapter/alarm evidence pass; exact future 9am delivery is not observed or guaranteed by Android's one-hour inexact window. |
| Live Plaid readiness | Verify current provider entitlements/pricing, HTTPS webhook and per-platform returns/allowlists, delivery and substantiated security requirements. Prepare a scoped live rollout and obtain required production/spending approval before activation or real-bank use. | Investments pricing unverified and product disabled; Liabilities disabled. Fifteen security attestations lack sufficient evidence; preexisting zero-trust claim was not verified. Do not attest beyond evidence. |
| Privacy, dependencies and rights | Match final artifact/services to accurate disclosures; substantiate provider/content rights and any required territories. Recheck dependency findings if code changed. | Six-type Apple draft is unpublished. Last source audit recorded registry 2 high/4 moderate despite tested local mitigations and unchanged-version flags; this is not blanket security clearance. See dependency-security-status.md. |
| Store/Mac distribution preparation | Match screenshots/reviewer notes to intended build; verify Google Play access/signing/fees; prepare Mac notarization under suitable approval. | Apple build 30 and four screenshots/private reviewer details are saved. Protected primary credential exact readback was unavailable. Existing owner-only Team (Expo) assignment was automatic; no external invitations. Do not submit, publish privacy, release or incur new fees without scope/approval. |
| Final acceptance and publication | Reconcile all brief criteria, confirm relevant latest CI, push reviewable commits and update TylerOS project/linked tasks with evidence and remaining blockers. Obtain scoped approval for merge/deployment/publication. | PR20 is not merged. Existing approved additional Railway budget is up to $10/month, not a provider hard cap. Do not extend the goal into forecasting/gamification. |

## Resolved or historical blockers

- Mac Developer ID signing and Apple private build 30 upload/attachment are
  completed within their approvals; notarization, public distribution and store
  submission are distinct.
- Capital One showed Enabled in the September 15 audit; Chase and Schwab showed
  OAuth Enabled September 22. Older “In review”/access-request statements are
  historical. Recheck before live activation; an unenabled product is not
  necessarily permanently ineligible.
- Approved PR15 migration/backups and PR16–19 email/isolation/deletion rollouts are
  recorded as completed. No duplicate approval is needed for already completed
  scoped actions; new rollout consequences still require appropriate approval.
- Workspace support delivery/authentication, Resend domain/TLS and approved reset
  tests passed. Repeating outbound tests needs a reason and matching scope.
- Earlier storage/ANR failures remain historical evidence. September 22 storage
  recovery allowed continued work but does not establish the cause of an earlier
  OAuth loop or emulator rendering problem.

Source: [Notion brief](https://app.notion.com/p/3d57f32d407581d9a9eafcdb4d5ac152).
Exact chronology and commands: [beta-progress.md](beta-progress.md).

September 22 hosted update: candidate df12257 passed CI286 and was deployed to the
approved isolated API. Signature enforcement, actual provider-signed full-Item
revocation, fixture cleanup and preserved two-login ledger/planning checks pass.
Evidence: `evidence/2026-09-22/hosted-signed-webhook.json`. Native investment repair
and OAuth remain open; this is not a live-bank or store-binary pass.

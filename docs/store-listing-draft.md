# Store preparation — September 11, 2026

User authorized preparation, explicitly no submission. Existing Apple record
6766112205 was verified under Tyler Andrew Medina, iOS1.0 Prepare for Submission,
manual release selected. No replacement record is needed.

## Promotional text

A shared plan. Space for what’s yours. Plan spending, split category responsibilities, track upcoming bills, and explore a clear path through debt.

## Description

Build a life together without merging all your money.

Worthlane helps couples moving in together make a shared plan while keeping clear space for each person. You can also plan solo or manage a family household with up to two separate, consenting logins.

MAKE RESPONSIBILITIES CLEAR
Assign a category to one person, split it equally, or choose custom percentages. See the household plan and your own share. Who paid, who is responsible, and what you choose to share stay separate.

UNDERSTAND YOUR SPENDING
Track accounts and categorized transactions, with manual entry available when you need it. Review personal and household totals based on your sharing choices, and see when connected data needs attention.

KNOW WHAT IS COMING
Keep bills and card due dates together. Record current balance, statement balance, minimum payment, and due date separately. Choose reminders and correct estimated recurring expenses.

MAKE A DEBT PLAN YOU CAN EXPLAIN
Compare avalanche and snowball estimates using balances, interest rates, minimum payments, and your monthly payment budget. Save your plan and revisit its assumptions, estimated interest, and payoff timeline. Estimates are planning guidance; Worthlane does not make payments or transfers.

SHARE BY CHOICE
A partner joins by accepting an invitation and keeps a separate login. Choose personal account visibility, balance summaries, or shared details. Solo setup does not require inviting anyone.

A calm place to plan what matters, together.

## Keywords (saved September 14)

couples,budget,household,bills,debt,payoff,expenses,spending,shared,finance,savings,money

## Private review notes (saved preparation draft September 14)

PREPARATION DRAFT — DO NOT SUBMIT YET.

Worthlane is now a couples-first budgeting beta, also supporting solo users and families managed by up to two consenting logins. The former manual-only/loss-aversion release notes are superseded.

Verified desktop and iOS Simulator flows use Plaid Sandbox. Production access and the final release backend are being prepared; this draft does not claim live banking is enabled. Final review access and bank-link instructions must match the selected release build before submission.

The app supports manual accounts and transactions, owned/equal/custom category responsibilities, account visibility choices, bills/reminders, and deterministic avalanche/snowball debt estimates. It makes no payments or transfers.

Account deletion is available under Settings > Delete account. Before submission, verify deletion and bank-access revocation against the release service, provide dedicated reviewer credentials in the private sign-in fields, and attach final screenshots. Do not use local synthetic credentials with a production service.

## Remaining preparation

- Final screenshots from actual app with synthetic data; distribution build and
  hosted API verification. Local debug APK is not a store artifact.
- Distribution signing for the personal Apple team and Android upload signing.
  Google Play record and access have not been verified.
- Privacy/Data Safety answers must match final enabled services, including account
  identifiers, financial data and optional analytics/diagnostics. Do not claim
  no collection. Verify support mailbox and account deletion behavior.
- Private reviewer contact is saved; dedicated review credentials remain required. Do not
  put local synthetic credentials or real financial information in store fields.
- Confirm age rating, territories, pricing and accessibility from actual evidence.
- No Add for Review, Submit for Review, publication or automatic release.

Sources: [Apple app records](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app),
[Apple privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy).


## September 14 save diagnostic

Restored signed-in Apple draft. Promotional text and description still present;
manual release remains selected. Prepared updated notes mentioning Android proof
and the candidate keywords. Save exposed four required review-contact fields:
first name, last name, email, phone. This explains the failed private-note save;
it is not a browser sign-in blocker now. Awaiting the user-designated private
review contact or direct entry. Do not invent contact details, reviewer credentials
or claim the new notes/keywords persisted. No Add for Review or submission.

## September 14 successful save

Tyler supplied and authorized the private review contact. Entered first/last name,
phone and email, saved, then reloaded. Corrected preparation notes and keywords
persisted; Save disabled, Prepare for Submission and manual release retained.
Text snapshots/DOM value checks omitted phone/email values despite their presence;
visual inspection after reload confirmed the authorized contact fields. No contact
values copied into this repository. No Add for Review or submission. Dedicated
reviewer sign-in, screenshots, build and final privacy/signing remain pending.

## September 14 signing and Play access inspection

Personal Google account reaches Play Console developer signup; the Workspace
account has Play Console disabled. No developer account created, terms accepted
or registration fee paid. Do not treat the signup page as an app record.

Local keychain contains Apple Development identities for Tyler, but no personal
Apple Distribution identity; an unrelated organization identity is outside this
project and must not be used. This is local evidence only: EAS-hosted credentials were unverified at this earlier checkpoint; see the
September15 refresh below. Current Android release signing is null until injected
by EAS/private local configuration, and the Gradle gate rejects missing/debug
signing. Before store delivery, validate authorized credentials and inspect the
actual candidate artifact signature.
No private signing material or account identifiers stored here.

## Privacy evidence for the candidate — September 14

Preparation only; final App Store Connect answers must match the selected build
and its enabled backend/SDK services. Do not select "Data Not Collected".

| Data / purpose | Current source evidence | Release disclosure decision |
| --- | --- | --- |
| Email and user identifier / authentication | User.email, User.id, passwordHash and refresh-session records in Prisma | Collected and linked to the account for app functionality. Password hashes are retained; no plaintext password-storage claim. |
| Household display names and invited email / collaboration | HouseholdMember and invitation/acceptance flows | Account-linked collaboration data; partner disclosure follows explicit invitation and visibility choices. |
| Financial data / planning | Account, Transaction, DebtPlanEntry, Budget, UpcomingObligation and household responsibility models | Account-linked financial data for app functionality, including manually entered data. Transactions contain purchase history; map the exact Apple categories during final questionnaire review. |
| Push destination / reminders | Optional User.pushToken and push service | App functionality when registered; distinguish remote push tokens from local-only scheduled notifications. |
| Product interaction / analytics | Optional PostHog keys; captureV1Event enums and auth events; opaque user identification | If enabled, analytics remain linked to a user identifier. Do not claim anonymous analytics. Confirm release environment before selecting final answers. |
| JavaScript crash diagnostics | Candidate mobile beforeSend reconstructs an allowlist; no request/user/breadcrumb/extra data, raw messages or arbitrary frame paths | Generic error reports and app release/bundle positions only when a DSN is enabled. Diagnostic data still counts as collection. |
| Native crash reports / traces / screenshots | Candidate disables native SDK, automatic sessions, traces, screenshots and view hierarchy | Candidate deliberately omits native crash reporting until native privacy filtering is reviewed. This reduces debugging detail; JavaScript initialization remains valid without a DSN. |
| Device biometric authentication | Local authentication adapter; biometricEnabled preference in User | No evidence that biometric templates are uploaded. A preference flag is distinct from collecting biometric measurements. |

Evidence: packages/db/prisma/schema.prisma, apps/mobile/src/lib/posthog.ts,
apps/mobile/src/lib/v1-analytics.ts, apps/mobile/src/store/auth.ts,
apps/mobile/src/lib/sentry.ts and diagnostic-privacy.ts. SDK configuration tests
cover enabled/disabled/malformed optional settings and removal of synthetic
private payloads. Final native artifact and enabled production services still
need verification; this matrix is not a published privacy declaration or a
claim about historical vendor retention. Support mailbox operation, dedicated
review credentials and final deletion verification remain open.

## Android release-signing gate — September 14

The tracked Android release build no longer falls back to the development key.
Release packaging tasks now fail before execution when signing is missing, uses
the debug configuration/default debug alias or filename, lacks passwords, or
points to a missing keystore. Debug builds remain available for laptop tests.

EAS injects private signing configuration before Gradle runs, as described in
[Expo's build process](https://docs.expo.dev/build-reference/android-builds/).
Configure the authorized upload key through EAS credentials or a private local
signing configuration before release packaging. Do not commit keys/passwords or
reuse another app's credentials. Native directories are tracked; if regenerating
them with prebuild, preserve the release-signing-check.gradle application.

Run `node scripts/test-android-release-signing.mjs` on macOS/Linux with Java to
exercise the actual Groovy gate against isolated Gradle fixtures. It does not
compile Android or sign an artifact. Final AAB/APK signature and registered upload
certificate still require verification; filename/alias checks do not prove the
identity of an arbitrary keystore. No private key was generated or uploaded here.

## Expo account access check — September 14

The installed EAS CLI returned `Not logged in` from `eas whoami` in
apps/mobile. The tracked project is configured for the tymedina100 account;
hosted distribution credentials remain unverified until Expo CLI authentication
is restored. This is independent of Apple or Plaid browser sign-in. No login
secret was requested or inspected, build queued, key generated, or submission made.


## September 15 — Expo account and hosted signing inspection

Expo CLI authenticated as the owner and resolves the expected
@tymedina100/worthlane project (4628c392-701f-498a-a861-31e21806edc3).
Read-only credential inspection (Apple portal login declined) shows personal-team
iOS distribution certificate and App Store profile expiring March16,2027; EAS
reports the profile active. Existing push and App Store Connect keys are also
present. This is hosted metadata, not fresh Apple portal validation. No keys were
created, exported, downloaded, rotated or revoked.

Android has an existing default JKS keystore for com.worthlane.mobile. No FCM key
or Play submission service-account key is assigned. Local scheduled reminders do
not depend on FCM. Play registration/access and final artifact/upload-key matching
remain separate gates. Current Gradle release signing requires real credentials
and explicitly rejects the debug keystore; the old debug-binding note is stale.

Recent EAS history includes completed production/store Android build4 from
10cd6fa and iOS build27 fromd759913 onSeptember10. Those precede the current
candidate and are not evidence that current code is packaged or ready to upload.
No new build, submission or paid service was started during this inspection.


## Hosted Mac candidate — September15

A separate local candidate is installed at
`/Users/tylermedina/Applications/Worthlane Hosted Beta.app`, pinned to the deployed
HTTPS planning client. Packaged sign-in/recovery navigation and normal cold
relaunch passed, with19 native tests,8 asset checks,8 hardened-fuse checks and
strict local signature verification. It no longer needs localhost servers for
startup. This is an ad-hoc local package, not a notarized public installer; no
store upload or submission occurred. Full evidence and archive hash are in
beta-progress.md. Production banking and authenticated household acceptance were
not exercised through this candidate.

## App Store draft refresh — September15

User restored App Store Connect sign-in. Saved the review notes with verified
local PostgreSQL deletion, real Sandbox revocation, hosted email/recovery evidence
and explicit final-build/reviewer-environment gates. Contact fields use Tyler's
previously authorized review details. Save returned disabled; manual release
remains selected and no build was attached.

Uploaded the three unmodified1320x2868 Simulator screenshots already captured in
`docs/evidence/2026-09-14/store-draft` (custom-budget, household, debt-payoff).
Reloaded Media Manager: all three persist in6.9-inch, and6.5-inch inherits them.
These are draft preparation assets, not final artifact-parity approval. Upload
processing/order changed during the interaction; final editorial order still
needs review. No Add for Review, submission, publication or paid build occurred.

PR18 merged2e34881 under explicit approval. Both Vercel production deployments
succeeded (desktop6465691175, site6465684233). Railway skipped unchanged API files;
PR16 remains Active. Main CI35007532665 has passed PostgreSQL17/18 and Windows;
the general CI job was still running at this checkpoint.

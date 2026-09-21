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
| Plaid Link SDK user identifier / bank linking | September18 source package13.2.0 contains LinkKit7.1.2; its device framework PrivacyInfo.xcprivacy declares UserID, linked=true, tracking=false, purpose=AppFunctionality | Include SDK collection in the final questionnaire even when Worthlane analytics are disabled. This is bundled-manifest evidence, not a network audit or a complete statement of Plaid server-side data use. Recheck the final packaged artifact. |
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

## September18 — current internal candidates

Source `1dd2196986b708b4f977f5cf7f396a81cee07084` pins Plaid13.2.0 and includes the dashboard unpaid-payment wording and Settings safe-area fixes. Internal Android build `22734e79-123e-40cf-9d57-1ffd463f2f10` and laptop-only iOS Simulator build `eb664bae-4ce2-40c0-bed0-bcd91aabffb8` were uploaded to EAS using verified included Free capacity. Both builds finished; exact artifacts passed signature and Sandbox-origin checks. Android passes saved sessions, Chase OAuth/import/repeat sync/selective unlink, forced repair, reminder delivery and queued/delivered logout cleanup. iOS Simulator passes saved sessions, standard Link/import/repeat sync/selective unlink, forced repair and reminder delivery/history cleanup. iOS OAuth remains unverified after two unsuccessful Simulator attempts; physical phones are outside the authorized scope. See docs/hosted-sandbox.md for artifact IDs, hashes and provider/data readback. These internal/Simulator artifacts are not App Store attachments or current store-ready device builds. No submission was made.


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

## September 18 packaged Simulator privacy inventory

Inspected all14 PrivacyInfo.xcprivacy files in actual EAS artifact
`eb664bae-4ce2-40c0-bed0-bcd91aabffb8`, source `1dd2196`. Paths, SHA256 hashes
and exact declarations are preserved in
[evidence/2026-09-18/ios-sandbox-privacy-manifests.json](evidence/2026-09-18/ios-sandbox-privacy-manifests.json).

- LinkKit declares account-linked UserID for app functionality, not tracking.
- RevenueCat declares unlinked purchase history for app functionality. Its
  presence does not establish collection: the Sandbox profile disables paywall
  and source configure() is guarded by that flag and a key. Final enabled store
  configuration still needs a purchase-data disclosure review.
- Sentry declares unlinked crash, performance and other diagnostic data for app
  functionality. Source disables native SDK/traces and Sandbox disables its DSN;
  these controls do not remove bundled declarations or prove vendor retention.
- No manifest lists tracking domains or a true tracking declaration. Some omit
  the top-level tracking key; omission is not independent proof of no tracking.
- App-level required-reason categories include file timestamps, user defaults,
  system boot time and disk space. Reason codes are preserved in the inventory.

This closes the packaged Simulator manifest inspection gap only. Repeat against
the final device/store archive, compare enabled services and complete Apple
privacy answers before submission. No questionnaire or production setting was
changed. Earlier September14 support-mailbox/deletion gaps are historical; later
email and deletion acceptance evidence supersedes them, not this manifest audit.

## September 21 content-rights and mobile source parity review

Read-only source comparison from packaged mobile source `1dd2196` to `3bb0edc`
shows no changes under apps/mobile, packages/core, packages/contracts or
packages/types. Thus the recent desktop session fixes do not themselves require
another mobile build. This does not turn a Simulator archive into a signed device
archive or close the iOS OAuth gap.

Visible third-party material includes Plaid's bank-link interface, institution
branding, and account/transaction data returned under user consent. The mobile
UI also uses Ionicons via @expo/vector-icons. Its installed package and vendored
react-native-vector-icons both include MIT license notices; retain applicable
notices in distribution. SDK/open-source licensing and the authorization to
access financial content are distinct checks. Source inspection found system
fonts and no remote photo/video loading in the app/app-source TSX paths searched;
that limited negative search does not establish ownership of every asset.
Worthlane brand assets are present locally; their filenames alone do not prove
provenance or worldwide rights.

Installed direct runtime dependency versions, declared licenses and license-file
names are inventoried in
`evidence/2026-09-21/mobile-direct-dependency-licenses.json`. This inventory omits
transitive/native frameworks and is not a complete license-compliance finding.
No App Store content-rights certification was saved. Apple's content-rights field
requires the necessary rights or legal permission for third-party material in
each distributed region; do not answer “no third-party content” merely because
there are no third-party articles or videos. Review the actual Plaid agreement,
asset provenance and intended territories before making the final declaration.

Reference inspected September21:
https://developer.apple.com/help/app-store-connect/reference/app-information/app-information

Sentry live settings were also rechecked: both worthlane-api and
worthlane-mobile have server-side/default scrubbing enabled and IP-storage
prevention disabled. Scoped owner approval has been requested for only those
two IP switches; no setting changed during this inspection.

## September 21 approved Sentry IP privacy change

Owner approved enabling Prevent Storing of IP Addresses in worthlane-api and
worthlane-mobile. Both previously-off switches were enabled through the signed-in
Sentry project Security & Privacy pages. Autosave completed, then both pages were
reloaded: each IP-prevention control remained checked (1); server-side scrubbing
and default scrubbers also remained checked. Verified at 18:57 UTC. This closes
the pending two-switch approval gate. It applies to new events only; no claim
of historical IP deletion or a completed final App Store privacy declaration.
No paid plan, credential, application deployment or store submission changed.

## Prepared store-format Sandbox build profile

`sandbox-store` inherits the guarded sandbox-preview environment but produces
store-format signed device artifacts: iOS simulator=false and Android app-bundle.
It uses remote build-number increments and has no matching submit profile.
It still targets only the isolated hosted Sandbox API and rejects inherited
production URLs, analytics/diagnostic credentials, AI or paywall activation.
The production profile is unchanged. This is preparation, not a built, uploaded,
submitted, or accepted store candidate.

Seven mobile-release configuration tests pass, including malicious/inherited
setting rejection for this new profile. The installed EAS18.3.0 schema/resolver
independently resolves both platforms to distribution=store, environment=preview
and the isolated API; iOS resolves simulator=false and Android app-bundle.
Reference: https://docs.expo.dev/eas/json/ . Before building, verify included
capacity and authorized signing; do not use --auto-submit or eas submit.

### September 21 iOS store-format archive queued

Expo billing UI showed Free/$0, 3 iOS builds used of 15 included and a $0 estimate.
Using included capacity, invoked `eas build --platform ios --profile sandbox-store
--non-interactive --no-wait` at source da5677cd862f7b8385c63387b16b03532edd52cf.
EAS reused existing remote personal-team credentials and incremented build28.
No new credentials were generated. Non-interactive mode skipped fresh Apple
certificate/profile validation, so cached active metadata is not that proof.
Root gitignore excluded .tmp, environment files and native generated output;
upload was42.5MB. EAS reports build31792944-ceec-473a-ab52-3c8515650b14 IN_QUEUE,
IOS/STORE/sandbox-store. No --auto-submit, eas submit or App Store upload occurred.

This attempt subsequently failed signing because its cached profile lacked Associated
Domains. It is terminal and must not be monitored or restarted. The corrected
build29 below supersedes this attempt. A store-format Sandbox archive is not live banking.

### September 21 Apple draft refreshed after owner sign-in

Owner restored Apple access. Updated private App Review notes to reflect current
hosted native Sandbox evidence, explicit iOS OAuth limitation, and build28 still
being prepared rather than verified/uploaded. Saved and reloaded: notes persisted,
Save disabled, Prepare for Submission, manual release selected, Add Build still
shown (no attached build). Reviewer username/password remain empty.

App Privacy currently lists seven collected types: Name, Email Address, Other
Financial Info, Other User Content, User ID, Purchase History and Crash Data.
The first six show app functionality and account linkage; Crash Data still says
Set Up Crash Data and Publish is disabled. This is a live preparation-state read,
not a completed final declaration. Review actual build28 enabled services and
backend before finalizing diagnostics; do not infer collection solely from a
bundled SDK manifest. No privacy publication or review submission occurred.


### September 21 corrected signing and current archive

Under owner approval, regenerated the existing Apple App Store provisioning profile
and replaced only its cached EAS association. Exact-byte readback of the uploaded
profile matched SHA256
`30cae4ec1df11a79541e5010681a5ac12447f4850604de2a56755c5f6c4fd37e`.
The existing distribution certificate and personal team5FBXR5M5PJ were preserved.
The replacement includes Associated Domains; no capabilities were broadened.

Current job: **95aeed0d-68aa-434d-b879-f2ba35540eb5**, build29, source
`2c8693102d94cea516e04b104e0c12f18fabcc1a`, profile sandbox-store.
EAS finished at19:21:40UTC on September21. Downloaded21.8MB IPA passes
strict deep codesign verification. Its embedded profile exactly matches the approved
replacement; signed app/team, Associated Domains and get-task-allow=false pass.
The actual bundle contains the fixed Sandbox API; all14 privacy manifests exactly
match the tested Simulator archive. Packaged Sentry DSN is a non-string object,
which configString rejects; guarded build settings require analytics/diagnostics
credentials absent and AI/paywall disabled. This static check is not a network
audit or a physical-device launch. Evidence: evidence/2026-09-21/ios-store-29-archive.json.

Reloading App Store Connect confirmed the saved review notes name build29/source
2c86931, Save is disabled and the version remains Prepare for Submission.
No build was uploaded or submitted. The privacy questionnaire is still unfinished.


## September21 Crash Data draft completed, not published

App Store Connect live App Privacy questionnaire saved Crash Data with App
Functionality purpose, not linked to identity and not used for tracking. The
resulting preview lists Diagnostics under Data Not Linked to You; Publish is now
enabled but was not clicked. Other six collected types retain account linkage.
Basis: mobile diagnostic-privacy.ts reconstructs a generic allowlist with bundle
positions, without user/request/context/breadcrumbs/raw messages; sentry.ts disables
native capture, sessions, traces, screenshots and default PII. Earlier approved
provider IP-storage prevention was verified in both Sentry projects. Current
Sandbox artifact has no usable DSN; the draft conservatively retains crash
collection for the configured backend/possible release diagnostics. Reconcile
against the exact final selected build and services before publishing. No claim
of historical data deletion or broad organizational compliance is made.

Apple still has no attached build or reviewer credentials; release remains manual.
This finishes one draft questionnaire section, not store preparation or submission.


## September 21 — exact Sandbox telemetry configuration

Read-only Railway UI inspection of beta-sandbox / worthlane confirmed
`SENTRY_DSN` and `POSTHOG_PROJECT_KEY` are both empty. Each value was revealed
only for this check and then hidden; no configuration was changed. The service
was Sleeping and no pending changes were visible. Current store30 artifact
independently has an empty mobile Sentry DSN, and its Sandbox build guard rejects
nonempty mobile Sentry/PostHog settings.

This candidate therefore has no configured Sentry or PostHog collector on the
inspected mobile/API pair. The unpublished Crash Data answer was removed after this reconciliation;
the saved draft now has six data types and Publish remains untouched.
Source support for optional diagnostics alone does not prove collection in this candidate. Do not infer that no data is
collected: authentication, financial records, consented household details and
Plaid SDK collection remain in scope. This check does not establish historical
retention, other app versions, production telemetry, or a full network audit.
Evidence: `evidence/2026-09-21/sandbox-telemetry-configuration.json`.

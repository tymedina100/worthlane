# Hosted beta Sandbox — September 15, 2026

User approved the separate hosted API/database, Sandbox credentials and fresh
test-only secrets, with up to $10/month additional monitored Railway usage.
That budget is not a provider-enforced spending cap. No plan upgrade or store
submission was authorized by this approval.

- Project: existing Worthlane Railway project.
- Environment: `beta-sandbox` (`dbeb62fc-92fb-4bb1-b630-eafa600c897b`), created empty.
- API: `59dc5245-3e9e-4d69-8450-72c4c834aff1`.
- Database: `feadc03e-fdf4-49d6-a518-be9f1df9bf38`, separate PostgreSQL service/volume.
- HTTPS API: `https://worthlane-beta-sandbox.up.railway.app/api`.
- Active candidate: main merge `4b22bec`; corrected deployment
  `5e2f5f4d-7f8d-4c7a-8aa5-624a8eeffd93`.

The initial deployment applied all 25 migrations successfully, including system
category bootstrap, and started Next.js on port 3001. Its readiness probe failed
because Railway's port was not explicitly aligned. Setting `PORT=3001` and the
HTTPS target port to 3001 produced an Active, successful deployment. No database
reset, production copy, or demo seed was needed. The build used the repository's
Nixpacks/config commands despite the new-service UI initially showing Railpack.

API variables use only the existing Sandbox Plaid credentials and newly generated
auth/encryption/cron/proxy secrets. Database connection references this environment's
Postgres service. Email sending, paid AI, PostHog and Sentry are explicitly blank.
CI wait and API idle scaling are enabled. Production remains separate. No live
bank Items, production credentials or financial rows were copied.

## Persisted API acceptance

Run from the repository root with Node supporting `util.parseEnv`:

```sh
WORTHLANE_HOSTED_SANDBOX_APPROVED=true node scripts/test-hosted-sandbox.mjs --create
WORTHLANE_HOSTED_SANDBOX_APPROVED=true node scripts/test-hosted-sandbox.mjs --couple
WORTHLANE_HOSTED_SANDBOX_APPROVED=true node scripts/test-hosted-sandbox.mjs --verify
```

The script deliberately pins this exact host; it does not weaken local-only test
guards or accept a production URL. Its ignored mode-0600 fixture contains synthetic
logins and checkpoint IDs. Do not print, commit or publish it. Fixtures are retained
for interactive acceptance; this script does not delete them automatically.

Observed successful checks:

- HTTPS database health; unauthenticated accounts rejected.
- New synthetic registration and at least 16 seeded categories.
- Manual checking account and $23.47 transaction persisted.
- Actual Plaid Sandbox exchange, 15 total accounts including the manual account.
- A separate process/fresh login recovered exact account IDs and manual amount.
- Real Sandbox sync decrypted the persisted token without duplicating accounts.
- Invitation created before separate partner registration; household access denied
  before explicit acceptance of its code.
- Both fresh logins read the same household and responsibility records: $600 equal
  gives $300/$300; $150 assigned goes to the partner; $1,700 at 60/40 gives
  $1,020/$680. The total remains $2,450.
- Partner personal account/transaction endpoints return no owner financial rows.

The initial harness expected HTTP200 for exchange; the API correctly returned201.
The harness was corrected and recovered the already saved Item before continuing,
so this did not create an extra bank connection.

## Remaining acceptance

Interactive desktop/native clients must now be checked against this hosted
environment. These API assertions do not prove native Link/OAuth return, reminders,
release signing, or final screenshot parity. Those retain their existing local
evidence and separate release gates. Monitor actual incremental usage, and obtain
approval before exceeding the agreed budget or starting a paid EAS build.

## Interactive hosted-data check

Started a separate local desktop client on port3403 with an isolated Next output
directory and `WORTHLANE_API_URL` pointing to the hosted Sandbox above. The existing
port3402 client was not restarted. This verifies the real browser/BFF against the
hosted database; it does not claim that the desktop frontend itself is deployed.

- Signed in as the synthetic Morgan account through the rendered login form.
  Dashboard showed the15 saved personal accounts and $2450 household plan.
- Created a $100 monthly Food & Drink personal budget through the UI. Success
  message appeared, and full page reload retained it: $39.80 spent, $60.20 remaining
  from combined permitted manual/imported synthetic activity. Household plan stayed
  $2450 and assigned totals were Morgan1320/Avery1130.
- Signed out, confirmed the login form, then signed in separately as Avery.
  Dashboard showed no detailed accounts and visible net worth0, while keeping the
  same equal/assigned/custom household responsibilities.
- Avery's monthly-plan page showed no personal budgets, private budget total0 and
  the same2450 household plan. Morgan's private100 budget and account balances were
  absent.
- Browser error log was empty on both checked planning views; the owner screenshot
  rendered the forest/cream layout without a framework error overlay.

The personal budget remains as a synthetic acceptance fixture. Native release
artifact checks, hosted interactive Link/relink, reminder delivery and final
reviewer packaging remain separate work; prior local evidence is not replaced by
this narrower hosted-data verification.

## Hosted Link recovery and manual fallback

The in-app browser created Plaid's iframe, but no visible provider dialog opened.
The existing 30-second guard removed the frame and restored Connect bank with a
clear retry/manual-account message. Browser error logs were empty. This is a
failed interactive Link attempt, not evidence of successful linking. A requested
Chrome test surface was unavailable; no process was restarted to mask the issue.

After recovery, Avery created `Avery manual fallback` with a $125.50 balance through
the rendered form. Success appeared, and full reload retained the account, balance
and Personal visibility. `--verify-manual-ui` then used fresh logins to assert:

- Exactly that one partner manual account persisted at $125.50, without a Plaid Item.
- The owner still had exactly the original 15 account IDs, excluding Avery's account.
- No owner transactions leaked into the partner's transaction endpoint.
- Both logins retained the exact $2,450 responsibility plan.
- A real owner Sandbox sync still decrypted the saved token without duplicating accounts.

The test records the verified UI-created account ID in the ignored fixture so
subsequent `--verify` runs continue to check this exact privacy boundary. Next:
diagnose the provider frame load and complete actual interactive Link/OAuth,
then verify native release parity. Production access approval alone does not close
these gates. No production configuration changed in this check.

### Provider-frame diagnosis

A fresh retry with browser network diagnostics showed HTTP200 for the hosted-backed
`/api/plaid/link-token` request and Plaid's `link-initialize.js`. Two Document loads
failed with `net::ERR_BLOCKED_BY_CLIENT` (`blockedReason: other`). Request URLs,
tokens and response bodies were not logged. This identifies a browser-level block;
it does not prove successful provider consent or authorize bypassing protections.

The existing iPhone 16 Pro / iOS18.3 Simulator was booted, and its installed
Worthlane bundle was found. A local Metro process on8081 was started against the
hosted Sandbox, with dotenv disabled and AI/paywall/analytics disabled. No native
rebuild or paid EAS build was started. Native UI control encountered missing/stale
window errors; no hosted native sign-in or Link completion has been verified.
Available disk space was about2.3GiB after boot. Avoid a large rebuild until there
is adequate headroom; reuse the installed development client where compatible.

## Native login and persisted debt handoff

With user assistance opening the installed client and dismissing iOS's optional
password-save sheet, the development client loaded the current Metro bundle and
signed in as Avery against the hosted Sandbox. The native dashboard visibly showed
$125.50 net worth, $0 spent/$0 received, and the saved household with Morgan. This
proves hosted native login/data loading, not native Link or release-artifact parity.

`--debt` now saves an explicit manual zero-APR $300 card plan, with $100 monthly
payments and a $25 minimum due 2027-01-31. Hosted API checks passed for exact saved
input, explanation assumptions, three-month payoff through March, zero interest,
$300 total paid in the estimate, and remaining balances $200/$100/$0. Calling the
Upcoming handoff twice returned the same single unpaid $25 item, reminders off.
Transaction IDs were unchanged: planning a due date does not record a payment.
The partner receives404 for the private plan and its due-date handoff and cannot
see the owner's Upcoming item. These fixtures remain for interactive verification.
Actual notification delivery is not established by this API check.

During native work disk space fell to roughly400MiB. Metro and the Simulator were
stopped; no Gradle/Xcode build was running. Under the user's cleanup authorization,
only `.tmp/gradle/caches` (4.0GiB, rebuildable) was removed. SDKs, emulator data,
credentials/signing material, source, installed apps and database fixtures were
preserved. Disk then reported7.1GiB available. Local cleanup log:
`.tmp/storage-cleanup-2026-09-15.jsonl`. Next native check must restart Metro with
the same explicitly disabled analytics and hosted Sandbox configuration.

## September 18: resumed hosted debt UI acceptance

After the interrupted run, no listener remained on3403; restarted the existing
hosted-backed local client. Fresh hosted API verification passed for persisted
accounts, Sandbox sync, two-login responsibilities, manual fallback and debt handoff.

Signed in through the browser as Morgan and opened Goals & bills. The saved
zero-interest plan loaded its exact $300 balance, $100 monthly budget, $25 minimum,
January31 due date, March2027 payoff, zero interest and $300 estimated payments.
The existing Upcoming item showed $25 due2027-01-31. Clicking the plan's Add to
Upcoming button returned “This due-date item already exists” and exactly one edit
control/item remained.

Signed out and signed in separately as Avery. The same page showed no saved owner
plan and “No upcoming items yet”; neither the owner-plan nor owner-bill control
existed. Browser error logs were empty. This adds interactive hosted-data evidence
for debt persistence, duplicate prevention and privacy, not notification delivery
or native bank-link completion. The unexecuted native partner-link verifier draft
was preserved locally as an ignored patch rather than published as verified work.

## September 18: hosted-session native reminder presentation

Reopened the installed development client against hosted Sandbox through Metro8081.
Avery's saved session and $125.50 manual account were retained. In Settings, Send
test reminder reported scheduled; backgrounded the app using Simulator Home and
reopened it. Check test reminder status then displayed “Test reached notification
history,” explicitly distinguishing OS presentation from sound/banner visibility.

Source inspection confirms the diagnostic clears prior scheduled/presented test
notifications before creating a new DATE trigger ten seconds ahead. Status checks
read native scheduled/presented notifications filtered to the active user. Thus
this was fresh native OS-presentation evidence for the hosted session, not merely
a successful schedule call or an old notification. A saved obligation's actual
9am delivery, cancellation/session-switch behavior on this hosted run, and signed
release-artifact parity remain unverified. Coordinate gestures still return
noWindowsAvailable, so native Plaid consent/import completion is still open.

## September 18: native saved bill and private reminder preference

In Avery's hosted Simulator session, Upcoming > Quick add saved the synthetic
“Avery native bill check” for $42.75 due 2026-09-21. Reopened its native editor,
selected One day before, saved successfully, and reopened again. The editor
retained the amount, confirmed date, active state and checked reminder selection.

An independent process logged both synthetic users in again through the hosted
API. Avery's list contained exactly one matching BILL, amount42.75, dueDate
2026-09-21, reminderTiming ONE_DAY_BEFORE, isActive true and isPaid false.
Morgan's list excluded its ID. Morgan's PATCH against that ID returned404;
Avery's subsequent read retained the original name. No payment or transaction
was created. This verifies native mutation, server persistence and cross-user
access denial. It does not prove this bill's future 9am notification presentation
or cancellation on logout; those remain separate from the diagnostic proof above.

## September 18: native logout and reminder-history cleanup

Signed Avery out through Settings and observed the native sign-in screen. Signed
back into the same synthetic account: Today retained the $125.50 manual balance,
$0 spending/receipts and one $42.75 bill due in three days. iOS showed Save Password;
its AX controls were absent and coordinate input failed. Simulator Home followed
by reopening Worthlane through App Library dismissed the optional sheet without
saving credentials or requiring another user handoff.

Without sending a new diagnostic, Check test reminder status changed from the
earlier “Test reached notification history” to “No test found.” This establishes
that the previously presented diagnostic was absent after logout/relogin. It does
not directly inspect the pending obligation queue while signed out, nor prove
future 9am delivery.

Source inspection confirms logout calls setReminderSession(null) before network
logout and awaits cleanup; that function cancels scheduled obligation/test
notifications and dismisses presented ones. Fresh targeted adapter verification:
`cd apps/api && corepack pnpm exec vitest run --config vitest.mobile.config.ts integration/mobile-reminders.native.ts`
passed15/15. These mocked native-adapter tests cover stale-user suppression,
permission/session races, late-created notification cancellation, paid/inactive/
opted-out cleanup, deleted-item reconciliation and diagnostic logout cancellation.
Keep this unit evidence distinct from actual OS queue observations.

## September 18: isolated packaged Mac candidate and rendering blocker

Built a separate arm64 Electron43.1.1 app at
`.tmp/mac-sandbox/mac-arm64/Worthlane.app`, with bundle ID
`com.worthlane.desktop.sandbox`, display name Worthlane Sandbox and package name
`worthlane-sandbox`. Its archived configuration pins http://localhost:3403 with
developmentOnly true; that frontend targets the isolated hosted Sandbox API.
The existing production-hosted app and generated production URL configuration
were preserved. This is local frontend / hosted API evidence, not a deployed
Sandbox frontend or public Mac distribution candidate.

The initial build retained the original package name and did not produce a
separate running process while Hosted Beta was open (consistent with a shared
single-instance lock). Rebuilding with distinct extraMetadata.name produced its
own process. Package verification passed all8 assets and8 hardened fuses;
`codesign --verify --deep --strict` passed. ASAR SHA256:
`2b807dbc4d0c086dc0ed14c7fe3c7287ea1d34f2f7a368d51d5582973ffa62d2`.

The app's recovery UI correctly displayed a connection timeout. Two direct local
route checks each timed out after15seconds while Next process83251 remained at
about118% CPU; hosted /api/health returned200 in0.33seconds. TERM did not stop the
stuck local process; a targeted KILL and restart restored frontend responses.
The browser renders the login form, but this packaged Mac app renders an empty
cream window with the correct page title after recovery, refresh and cold launch.
No authenticated Mac acceptance is claimed. Next step is diagnose the packaged
renderer failure with the healthy frontend; do not weaken security settings to
make this test pass. No production deployment, credentials entered in the Mac
app, notarization, paid build or store submission occurred.

## September 18: packaged Mac two-login and cold-launch acceptance

A fresh inspection of the same Sandbox Mac app showed the complete login form.
No source edit, diagnostic instrumentation or security relaxation was made. The
previous blank observation was transient; its exact render delay/cause is not
established and must not be described as a fixed renderer defect.

Signed in as Avery through the packaged app. Dashboard showed only Avery's
$125.50 personal account, the shared $2,450 plan, groceries300/300, utilities150
assigned to Avery, and rent1020/680. Goals & bills showed the native-created
$42.75 bill due2026-09-21, with no Morgan saved plan/bill. Quit normally and
cold-launched the app: it recovered Avery's authenticated dashboard and the same
account/splits without entering credentials again.

Signed out (login screen replaced private content), then signed in independently
as Morgan. His15 account rows included14 Plaid Sandbox accounts and his manual
checking; Avery's manual account was absent. The shared plan retained the same
allocations. Goals & bills exposed Morgan's saved zero-interest plan and one
$25 minimum due2027-01-31, excluding Avery's native bill. Opening the saved plan
restored balance300, monthly budget100, minimum25, statement300 and January31
date; result showed payoff2027-03, interest0 and payments300.

This closes authenticated packaged-Mac/two-login/cold-launch evidence for the
isolated hosted API through a local frontend. It does not prove a deployed
Sandbox frontend, production-hosted authentication, Developer ID/notarization,
or native Plaid Link completion. The installed production-hosted app was not
modified, and no financial data or secrets were sent to production.

## September 18: reproducible internal mobile candidate profile

Added `sandbox-preview` to mobile eas.json, extending internal `preview`. It pins
the isolated hosted API, Plaid enabled, worthlane.app associated domain and the
existing5FBXR5M5PJ team identity. AI/paywall are off; PostHog/Sentry configuration
and Sentry upload credentials are empty. Expo dotenv loading is disabled. The
app config validates these values and rejects conflicting inherited settings,
including a production API URL, wrong OAuth identity or enabled telemetry.
Existing preview/production/development behavior remains unchanged.

The release-config and mobile-diagnostics tests pass, together with all6 real
Gradle signing-guard fixtures (including rejection of missing/debug signing).
Expo CLI `config --type public --json` resolves the actual profile to Worthlane,
iOS/Android com.worthlane.mobile, applinks:worthlane.app, existing team identity
and disabled diagnostics. CI already runs both test scripts. Configuration
uses documented EAS profile inheritance/env behavior:
https://docs.expo.dev/build/eas-json/

This prepares a reproducible internal build; no EAS build, upload, installation,
production setting change or store submission was performed. The profile keeps
the existing app identifiers for OAuth parity and has no submit profile. Final
binary API/feature/signature checks and interactive journeys still must pass.

Build review follow-up: the tracked Android project applies Sentry's Gradle hook
even without the optional Expo plugin. The installed hook checks
SENTRY_DISABLE_AUTO_UPLOAD; sandbox-preview now pins it true and rejects an
override, avoiding upload attempts with intentionally empty credentials.

EAS CLI schema validation follow-up: empty env values are rejected by EAS even
though Expo config can resolve them. Removed empty credential entries from
eas.json; the app-config guard still rejects any inherited nonempty diagnostic
configuration. These variables must be absent/empty in the selected EAS preview
environment before building. Added coverage preventing empty profile env values.

After correction, authenticated EAS18.3 build inventory and
`eas config --platform ios --profile sandbox-preview --json --non-interactive`
both succeeded. Inventory still shows latest finished Android build35306d6e
from September10/10cd6fa and iOS8a096d23 from September10/d759913; neither is the
current candidate. No build was triggered by these read-only checks.

Laptop-only build preparation: `sandbox-simulator` extends sandbox-preview with
iOS simulator:true. Both profiles receive the same fail-closed environment
guards. EAS CLI resolves internal distribution, simulator:true,
developmentClient:false, existing bundle identity and diagnostics disabled.
All6 release-config tests pass. This is intended to produce a bundled Simulator
app without Metro; no remote build/upload was started. Expo billing browser
requires sign-in before remaining credits/cost can be verified.


### September 18 — standalone iOS Sandbox artifact

EAS Simulator build `bb102818-1876-422c-ac62-6055de147467` finished from
`79d8ae9fc826172afc11e3aa1a2f433cc970b1fe`. It used the existing Free plan;
billing showed 1/15 iOS and 3/15 Android builds used before these two jobs.
No plan upgrade or store submission occurred. Android internal build
`c9853f0d-37bc-49d9-aa11-2c58d0b82397` remained queued at this checkpoint.

Downloaded iOS archive: 27,356,189 bytes. `codesign --verify --deep --strict`
passed. Artifact Info.plist reports `com.worthlane.mobile`, version 1.0.0,
build **7**, `iphonesimulator`; this differs from EAS UI metadata showing 27.
Use the actual artifact value, not dashboard metadata, for release parity.
The universal executable includes arm64 and x86_64. Simulator signature has
empty entitlements, so this does not prove device associated-domain signing.
Bundled JavaScript is 7,055,877 bytes, SHA-256
`8e39ef97cdf45d5932f39f114c3736cc6affddaa9be2cb283b9209f53aba6446`.
It contains the exact hosted Sandbox API URL and no production API origin.

Installed over the development client on the laptop iPhone 16 Pro / iOS 18.3
Simulator. Launched from the Home screen into the bundled standalone app:
Avery's saved session restored, showing $125.50 manual assets, $0 spent and
received, the synthetic household with Morgan, and exactly one $42.75 upcoming
bill. Upcoming showed September 21; reopening its editor retained the exact
amount/date and checked One day before reminder choice. Closed without edits.
A fresh test reminder was scheduled, app backgrounded to Home, then reopened;
Check test reminder status reported **Test reached notification history**.
This proves OS presentation history, not an observed banner, sound, or actual
future 9 a.m. bill delivery. No new native Plaid lifecycle proof is claimed.


### September 18 — standalone iOS second login and native sync

On the same EAS artifact from `79d8ae9`, Avery signed out to a clean login screen.
Morgan signed in separately; the iOS Save Password sheet was dismissed via Home
and reopening Worthlane, without asking the user to operate the Simulator.
Morgan saw 14 linked Sandbox accounts and his $100 manual account, not Avery's
$125.50 account. Upcoming showed only the $25 January 31, 2027 minimum payment,
not Avery's $42.75 September 21 bill. Checking test reminder status under Morgan
returned **No test found** after Avery's prior presentation, proving that prior
test notification history was cleared across this logout/login boundary.

Native Sync now completed and refreshed the Healthy institution's timestamp.
A separate `WORTHLANE_HOSTED_SANDBOX_APPROVED=true node
scripts/test-hosted-sandbox.mjs --verify` passed fresh-login saved account ID,
manual amount, persisted-token sync/no duplicate accounts, three-payment
zero-APR plan, idempotent bill handoff, exact $2,450 allocations and partner
account/transaction isolation assertions. This adds native sync evidence,
not a new native Link/OAuth/reconnect/unlink completion.

The dashboard labelled all unpaid items as “coming up” above a seven-day total,
including Morgan's item due 135 days later. Source copy now explicitly labels
that all-date count **unpaid payments**, retaining the separate seven-day total.
Mobile typecheck passed. This copy adjustment is not yet in the installed
`79d8ae9` artifact and requires the next candidate's visual check.


### September 18 — complete-ledger sync verification

The hosted verifier now requests up to 1,000 transactions and asserts that the
response length equals the authoritative total. It fails if the fixture exceeds
that bound, instead of silently comparing only the API's default first page.
After an initial settling sync, a second real Sandbox sync returned zero added,
modified and removed rows. All **49** saved transactions retained identical IDs
and financial fields; imported activity and exactly one known manual transaction
were required. The saved debt handoff also compares the complete ledger.
Command: `WORTHLANE_HOSTED_SANDBOX_APPROVED=true node
scripts/test-hosted-sandbox.mjs --verify` — passed, including $2,450 category
allocations and separate-login privacy assertions.

Standalone iOS Repair opened Plaid's update screen. Its embedded controls again
provided no accessibility elements, and a screenshot-grounded coordinate click
failed with Computer Use `noWindowsAvailable`; keyboard focus did not reveal a
usable control. No consent, repair success, or new connection is claimed.
Android EAS build remains queued; no duplicate build was started.
The iOS artifact's build 7 matches app.json and the native Info.plist; EAS UI
metadata's 27 is not authoritative artifact evidence.


### September 18 — Android cloud artifact complete

EAS internal APK build `c9853f0d-37bc-49d9-aa11-2c58d0b82397` finished at
16:08:40 UTC from `79d8ae9`, after the free queue and release compilation.
Downloaded APK is 100,427,076 bytes, SHA-256
`dadeeedd8aa2fc903f4ab3b1a628aa308b7a0317bca13cbeb0bddf8dacbae357`.
`apksigner verify --verbose --print-certs` passes APK v2 signing, one RSA2048
signer; certificate SHA-256
`bb3fd1e47164421d9d40a4e6594e1ab69c2be8d4056f587dfb0af29b50992432`.
Package `com.worthlane.mobile`, version1.0.0/code4, minSDK26/targetSDK36;
arm64-v8a, armeabi-v7a, x86 and x86_64 libraries present.
Bundled JavaScript SHA-256
`17bb215601e1bfc1c39014b93632271302ccad1e3a8fddfa27e6a081bb9a2494`;
it contains the exact hosted Sandbox API and no production API origin.
Manifest disables Expo updates and Sentry auto-init and includes Plaid return
schemes. These static checks are not interactive banking acceptance.

The existing WorthlaneLaptop Android36 emulator booted successfully after a
prior crash-report consent prompt blocked startup; crash reporting was set to
never for this process. The iOS Simulator was shut down to reduce memory use.
An in-place `adb install -r` safely rejected the APK with
INSTALL_FAILED_UPDATE_INCOMPATIBLE: the prior installed app has a different
signature. Its data was not removed. Use a separate test environment rather than
uninstalling the old fixture. Computer Use then reported the Mac locked; user
unlock is pending before interactive testing. No store submission occurred.

CI run35365722717 on `886a313` passed all four jobs, including PostgreSQL17/18,
Windows packaging and the full regression/typecheck/build job.

### September 18 — Android interactive Link and persisted partner isolation

User explicitly authorized ADB/UIAutomator/Maestro for the laptop emulator after Computer Use could not address it. Installed the signed standalone Android Sandbox build `c9853f0d-37bc-49d9-aa11-2c58d0b82397` in a separate `WorthlaneRelease` AVD; the original AVD remains intact. Logged in as the synthetic partner, opened Connect bank, chose First Platypus Bank (non-OAuth), entered public Sandbox credentials, continued account consent, and finished without saving a phone number. Worthlane returned with **Bank connected**, **Healthy**, and **14 accounts linked**.

Fresh independent API login verified 14 persisted bank accounts plus the existing $125.50 manual fallback, all disjoint from the owner's account IDs. The complete partner ledger contains **392 transactions**; repeat Sandbox sync returned zero added/modified/removed and retained all IDs and financial fields. The owner's separate **49-transaction** ledger remains disjoint. The partner's unpaid $42.75 bill survives. `WORTHLANE_HOSTED_SANDBOX_APPROVED=true node scripts/test-hosted-sandbox.mjs --verify` passes both ledgers, $2,450 responsibility allocations, privacy, persisted zero-interest debt plan and idempotent due-date handoff. The ignored, mode-0600 synthetic fixture stores the observed native Item/account/transaction identifiers; no credentials are committed.

Limits: this is first-link and API repeat-sync evidence, not OAuth, repair, unlink or Android reminder-delivery acceptance. The first emulator session suffered an input-dispatch ANR in Plaid Link under software graphics; restarting the isolated emulator with host graphics allowed the complete flow. This recovery does not establish the ANR's root cause or eliminate ongoing emulator responsiveness risk. The installed artifact predates the dashboard unpaid-payment wording correction. Disk free space is about 3.3 GiB; avoid additional large local builds.

### September 18 — Android update-mode return and cancellation

On the same signed standalone Android artifact, tapped **Sync now**, observed Syncing and then Healthy with an updated sync age. Tapped **Repair**, continued without a phone number, confirmed the existing First Platypus accounts, observed Plaid's reconnection success, and finished without saving a phone number. Worthlane displayed **Connection repaired**. The subsequent fresh-process hosted verifier retained the exact original Item, all 15 account IDs (14 bank plus manual), and all 392 partner transaction IDs; repeat sync left financial fields unchanged and the owner's 49-row ledger remained isolated. This is a healthy-Item update-mode round trip, not forced ITEM_LOGIN_REQUIRED recovery.

Opened a new **Connect bank** flow, tapped Exit and **Yes, exit**, and returned to the existing Healthy institution without an error dialog. A further verifier run checks cancellation against the same stored IDs rather than replacing the baseline. No phone, production banking or store submission was used. Slow rendering during Repair resolved without restart; the current emulator reported no ANR since boot.

### September 18 — OAuth redirect reached Android; completion still open

On the same standalone APK, Chase's Sandbox OAuth flow opened Android Chrome's First Platypus simulator. Public test credentials, simulated MFA, checking-account selection and the final consent action reached `com.plaid.internal.redirect.LinkRedirectActivity` and then `LinkActivity` (Android activity log at 09:54 Phoenix). Link returned to its pre-login screen without a success callback. A fresh authenticated API read at 09:58 found exactly the original Item and all 15 original account IDs, so no new connection is claimed.

One bounded retry reached final simulator consent, then Chrome reported an input ANR at 10:01:27. This is an unresolved OAuth acceptance result, not evidence that routing alone completes banking. Investigate SDK return/session state and emulator responsiveness before retrying; preserve the existing account/ledger baseline. Plaid's official OAuth guide requires completed return flows and separate update-mode testing: https://plaid.com/docs/link/oauth/.

The earlier host-graphics workaround did not eliminate ANRs: Link search hung again and Android displayed a system-not-responding dialog. Restarted the isolated AVD with two cores and requested 2 GiB RAM (emulator raises it to 2560 MiB), preserving its app data; iOS remains shut down. The later Chrome ANR still leaves responsiveness unresolved. Free disk is approximately 3.2 GiB. Repeated full-verifier logins also reached the intentional 10-per-15-minute authentication throttle; allowed it to expire without changing or bypassing the limit. Subsequent fresh login succeeded. No physical phone, production banking, paid build or store submission was used.

After force-stopping the unresponsive Chrome/app processes and relaunching Worthlane, a fresh full hosted verifier passed: exact 15 partner account IDs, complete 392-row partner and 49-row owner ledgers, repeat-sync financial-field stability, private fallback/bill isolation, $2,450 responsibilities and saved debt/due-date idempotency. The native dashboard rendered again; this is recovery evidence, not a completed OAuth flow or proof that the emulator reliability issue is fixed.

### September 18 — Android standalone reminder delivery and logout cleanup

On signed Android Sandbox build `c9853f0d-37bc-49d9-aa11-2c58d0b82397` (source `79d8ae9`), opened Notifications as Avery and accepted the emulator's OS permission prompt. The disabled-reminders banner disappeared. Sent the built-in DATE test reminder, backgrounded the app, and observed **Your test reminder** in Android's notification shade with Worthlane's monochrome notification icon and the generic text that no payment is due. No financial details appeared. Screenshot is retained locally at `.tmp/android-standalone-reminder-delivered.png`. This verifies actual OS delivery and icon presentation, not merely an app scheduling dialog.

A direct Android AlarmManager read showed exactly one pending Worthlane alarm: September20 at09:00 local, matching the persisted September21 bill's one-day-before preference. Android reports a one-hour inexact window; exact9am delivery is not promised or observed. Signed out through the app's confirmation dialog and reached the empty sign-in screen. A second complete AlarmManager read had zero pending Worthlane alarms; NotificationManager had zero Worthlane notification records. This independently verifies queued bill cancellation and delivered-test cleanup on logout in this release artifact. iOS evidence remains separate; no physical phone was accessed.

Resource recovery: removed only this task's reproducible Xcode Build outputs and a Gradle wrapper download cache (693,088KiB, approximately677MiB); retained source, build logs, signing credentials, EAS artifacts, databases and AVDs. Local cleanup inventory/rebuild instructions are in `.tmp/generated-output-cleanup.jsonl`. Disk free rose from3.2 to3.8GiB. macOS had over8GiB swap in use; Android diagnostic timeouts and prior ANRs remain a reliability limit, despite the completed reminder checks.

### September18 — guarded forced-login-error helper

Added `scripts/reset-hosted-sandbox-login.cjs` for the hosted repair test. It must run inside the exact isolated Railway project/environment/API service, with `PLAID_ENV=sandbox`, explicit `WORTHLANE_HOSTED_SANDBOX_APPROVED=true`, and the fixture's partner user/Item IDs. It checks the synthetic partner email and ownership before decrypting the stored Sandbox token in memory. Only `/sandbox/item/reset_login` is called; raw provider/database errors and credentials are not printed. After running it, native Sync must expose the repair state, and successful native Repair must preserve the existing Item/account/transaction baseline. A successful provider reset alone is not repair acceptance.

Syntax validation passed. Negative invocations rejected wrong environment, wrong service, production Plaid, missing opt-in and missing Item before database/provider access. The remote positive path has **not** run: Railway CLI rejected read-only SSH as Unauthorized. A fresh interactive `railway login` is waiting for browser sign-in. This is an authentication dependency, not a need for new production approval; no production service was selected or changed. Inspect the remote working directory/package layout after login before executing the helper. Native OAuth and selected unlink remain independent open tests.

### September18 — Settings scroll inset correction

Android reminder screenshots exposed Settings rows scrolling underneath the transparent status bar. Moved the existing top safe-area inset from ScrollView content padding to a fixed outer container so the viewport begins below the system bar; initial spacing and modal behavior remain unchanged. Mobile typecheck and diff whitespace checks pass. This is a source fix, not yet visual acceptance in the signed standalone artifact; include it with the existing dashboard copy fix in the next candidate build. Railway login is still pending and no hosted Item reset has run.

### September18 — second OAuth institution and green candidate CI

CI run35373223055 on `e9f5f45ef1e59ff308a4f3521ca9801b08841550` completed successfully in all four jobs: full regression/typecheck/build, PostgreSQL17, PostgreSQL18 and native Windows packaging. PR20 remains unmerged; these results do not validate the newer source visually in the older installed mobile artifacts.

After a further Worthlane input ANR, restarted the same isolated Android AVD headlessly without wiping data. Its saved Avery session recovered. Tested Bank of America's Sandbox OAuth path, this time disabling the simulator's bank-owned account-selection step, using public synthetic credentials/MFA and accepting the simulator terms. At10:26 Phoenix, Android returned to Plaid's **Log into Bank of America** screen instead of completing. `dumpsys activity lastanr` reported no ANR since this boot. This reproduces the incomplete return with a second institution and a different account-selection variant, without establishing the cause; neither institution has passed OAuth acceptance.

The subsequent full hosted verifier passed both fresh logins: exact original partner Item/accounts and392-row ledger, isolated49-row owner ledger, stable repeat-sync financial fields, private$125.50 manual fallback, exact$2,450 responsibilities and saved debt/due-date idempotency. The failed attempt added no connection to the persisted baseline. Exited the incomplete Link flow. Railway browser authentication remains pending for forced-error recovery; no production banking, paid build or store submission occurred.

### September18 — Plaid SDK update for native return retest

Pinned React Native Plaid SDK13.2.0 and its lockfile resolution. Plaid's September15 release updates Android SDK6.2.1 with an OAuth-return fix for a second institution in one Link session, and bundles iOS LinkKit7.1.2 with a privacy-manifest correction; JavaScript APIs are unchanged. Sources: https://github.com/plaid/react-native-plaid-link-sdk/releases/tag/v13.2.0 and https://github.com/plaid/plaid-link-android/releases/tag/v6.2.1. The reported upstream symptom is not an exact match for Worthlane's pre-login return, so this is a justified candidate update, not proof of a fix.

Mobile typecheck, seven native bank-return/state tests and six mobile release-configuration tests passed. Expo autolinking resolves13.2.0 on Android and Apple; the installed package declares Android sdk-core6.2.1. Existing installed standalone artifacts still contain13.1.0 and cannot verify this change. A new internal Android candidate will include this update, the dashboard unpaid-payment wording and the Settings inset correction. Expo billing freshly shows Free$0/month,4/15 Android and2/15 iOS builds used, with$0 estimated bill. No paid plan, production deployment or store submission is authorized by this build check.

### September18 — hosted Android forced-error recovery completed

Restored the expired Railway CLI session through the already signed-in in-app browser, verifying the pairing code for this laptop. Read-only SSH confirmed `/app/apps/api/package.json` and `/app/packages/db/package.json` in the exact isolated service. The guarded reset helper then returned provider-confirmed success for the existing synthetic partner Item. A first stdin-based SSH invocation timed out without a reset confirmation; native Sync still succeeded afterward. Passing the same guarded source as a quoted Node expression avoided the stdin/PTY issue and returned success. No secrets were printed or copied from the service.

On installed Android standalone `c9853f0d-37bc-49d9-aa11-2c58d0b82397` (source79d8ae9), tapped Sync now and observed **Could not sync**, **Needs relink**, and the warning that spending may be missing recent activity. Relink opened the existing institution's password screen. An initial test-password entry included an unintended trailing space and was rejected; removing it allowed public Sandbox credentials to continue. Confirmed the existing14 accounts and finished without saving a phone number. Worthlane displayed **Connection repaired**. Local screenshots: `.tmp/android-hosted-needs-relink.png` and `.tmp/android-hosted-forced-repair.png`.

Fresh full hosted verification passed afterward: exact original Item and15 partner account IDs, all392 partner transaction IDs/financial fields, disjoint49-row owner ledger, private$125.50 fallback and bill, exact$2,450 responsibilities and saved debt/due-date idempotency. This closes forced ITEM_LOGIN_REQUIRED recovery for this hosted Android artifact. OAuth and selected unlink remain open, as does current-source artifact parity. SDK13.2.0 builds are still in progress; no phone or production bank access occurred.

### September18 — current artifacts and Android OAuth completion

Both source1dd2196 EAS jobs finished: Android22734e79 at17:48:04Z and iOS Simulator eb664bae at17:41:05Z. Android APK is100,427,477bytes, SHA256 `5f291c2a34d7eba0228b10c0ed5a6fa0a971e626024e8da59de7ae4a9a78ed78`; APK v2 signature verifies. iOS archive is27,357,781bytes, SHA256 `9650ed482ad772022fb4231b9e569d95520aa719bd2234bdeff76a650792c063`; extracted app passes strict/deep codesign verification and contains LinkKit7.1.2. Both JavaScript bundles contain the hosted Sandbox origin and not the production API origin. Actual versions remain Android1.0.0/code4 and iOS1.0.0/build7. iOS runtime parity is still pending.

Installed Android with `adb install -r`, preserving the saved Avery session. Dashboard rendered the persisted bill and corrected **1 unpaid payment** wording. Scrolled Settings and verified content clips below the system status bar. Screenshots `.tmp/android-132-dashboard.png` and `.tmp/android-132-settings-scroll.png` record current-artifact UI parity for these fixes.

On this updated standalone artifact, completed Chase Sandbox OAuth: public credentials, simulated MFA, selected Checking, consent, native return, and Finish without saving. Worthlane displayed **Bank connected**. Fresh independent partner login found one new Chase Item/account and148 added transactions; the original Item,15 accounts and392 transaction IDs remained. All540 complete transaction records, including IDs and financial fields, stayed identical after repeat sync. Fresh owner login retained its exact original account IDs and exposed none of the new account. Local verifier `.tmp/verify-oauth-132.mjs` and protected `.tmp/android-132-oauth-fixture.json` retain the separate extra-Item checkpoint without overwriting the original baseline. Screenshot `.tmp/android-132-oauth-connected.png` records the app success.

This is completed hosted Android OAuth evidence, not production banking or proof of iOS OAuth. The old SDK failed; the updated artifact passed the comparable Chase flow, although no narrower root-cause claim is made. Selected unlink must now remove only the added Chase connection and restore the original baseline before rerunning the full two-user verifier. Current-artifact reminder/repair and iOS/Mac/store gates remain separate.

### September18 — selective native unlink and provider revocation

On current Android22734e79/source1dd2196, scrolled to the separate **Chase / 1 account linked** card, tapped its Unlink action, and confirmed **Unlink Chase?** after the dialog explained that this institution's accounts and imported transactions would be removed. A guarded observer running inside the exact isolated Railway service retained the synthetic Chase token only in process memory before the UI action. After the database Item disappeared, Plaid `/item/get` returned **ITEM_NOT_FOUND** for that former token. Observer exited0; no token was logged, persisted or exported. The original First Platypus connection was not targeted.

The UI then showed Avery's untouched$125.50 manual fallback instead of the Chase card. `WORTHLANE_HOSTED_SANDBOX_APPROVED=true node scripts/test-hosted-sandbox.mjs --verify` passed both fresh logins and restored the exact original partner Item/15 accounts/392 transaction IDs, isolated49-row owner ledger, unchanged repeat-sync records, private fallback/bill, exact$2,450 responsibilities and saved debt/due-date idempotency. This proves selected native unlink, provider revocation and preserved unrelated financial state on the current Android artifact. Local screenshot `.tmp/android-132-after-selective-unlink.png`; observer harness `.tmp/watch-sandbox-unlink.py`. The extra OAuth checkpoint is historical now; do not reuse its deleted Item as an active baseline.

Shut down Android to reduce memory use, booted the existing iOS18.3 iPhone16Pro Simulator and installed updated eb664bae without clearing app data. Launch recovered Morgan's dashboard, its saved household with Avery, private$25 card-minimum obligation and corrected **1 unpaid payment** wording. Computer Use screenshot verified this; clicking Settings still returned `noWindowsAvailable`. This proves current iOS saved-session launch/readback, not new iOS banking interaction. The authorized Maestro laptop-emulator path is being checked separately.


### September18 — iOS Maestro access and OAuth boundary

Authorized Maestro now operates the laptop iOS18.3 Simulator on updated eb664bae/source1dd2196, including Settings, Connect bank and provider screens. Computer Use still supplies screenshots but cannot click this Simulator. Exact tab accessibility labels and explicit keyboard dismissal are needed; several successful tool taps did not produce the expected screen transition, so tool completion alone is not acceptance.

Chase Sandbox OAuth opened the First Platypus bank simulator. Two attempts reached simulated credentials/MFA and final consent, then returned to **Couldn’t connect to Chase**. The controlled retry includes a screenshot proving the Checking checkbox is checked; the first text-label tap did not establish that state. A separate fresh API login afterward recovered the exact original15 owner account IDs and49 transactions, so no new connection is claimed. Local evidence: `.tmp/ios-132-oauth-account-selected.png`, `.tmp/ios-132-oauth-consent.png`, `.tmp/ios-132-oauth-retry-failed.png` (Maestro screenshot output).

The live `https://worthlane.app/.well-known/apple-app-site-association` and Apple CDN `https://app-site-association.cdn-apple.com/a/v1/worthlane.app` both returned200 with the matching5FBXR5M5PJ.com.worthlane.mobile association and `/plaid-oauth` path. Simulator ad-hoc codesign reports an empty entitlement dictionary; do not treat that as device-build evidence. Plaid’s current official troubleshooting guidance says Universal Links may not work correctly in Simulator and recommends physical-device testing: https://plaid.com/docs/link/troubleshooting/#oauth-redirects-not-working. These facts identify a remaining acceptance limitation, not a proven root cause. The user’s laptop-only boundary remains intact; no phone was accessed. Standard non-OAuth Sandbox Link is being tested independently.

Freed509,052,182bytes from this task’s reproducible Gradle downloaded-JDK cache; Maestro uses the separate installed system JDK21. Cleanup is inventoried locally; source, credentials, databases and current artifacts remain. Free disk recovered from806MiB to approximately1.6GiB.


### September18 — current iOS standard Link persistence

In the same updated iOS Simulator artifact, selected the non-OAuth First Platypus Bank variant, entered public Sandbox credentials, confirmed14 bank accounts and chose Finish without saving a phone number. Link returned to Worthlane Settings. A separate fresh owner login in `.tmp/verify-ios-link-132.mjs` found one new First Platypus Item and14 accounts while retaining every original account ID and all49 complete original transaction records. The new connection imported392 records: all441 complete owner transaction objects, not a sampled page, remained identical after repeat sync. Fresh partner login retained exact original15 accounts/392 transaction IDs and exposed none of the new private accounts or transactions. Protected checkpoint `.tmp/ios-132-link-fixture.json` identifies only the added Item; the original fixture is unchanged. This proves current hosted iOS standard Link/import and repeat-sync privacy, not iOS OAuth. Selected unlink and forced repair remain separate checks.


### September18 — current iOS selected unlink and revocation

The native **Bank connected** alert and healthy First Platypus14-account card were captured at `.tmp/ios-132-link-connected.png` and `.tmp/ios-132-linked-institution.png`. Selected Unlink on that new card and verified **Unlink First Platypus Bank?** before confirming. The isolated-service observer `.tmp/watch-ios-sandbox-unlink.py` restricts access to the synthetic hosted owner and added First Platypus Item; it retained the old Sandbox token only in process memory. Database removal was followed by provider `/item/get` returning **ITEM_NOT_FOUND**, observer exit0. The new card disappeared and the original$100 manual account remained visible. Screenshot `.tmp/ios-132-after-selective-unlink.png`.

The full `WORTHLANE_HOSTED_SANDBOX_APPROVED=true node scripts/test-hosted-sandbox.mjs --verify` run then passed both fresh logins: original15 owner accounts/49 complete transactions, original15 partner accounts/392 records, repeat-sync stability, private$100/$125.50 fallback and bill isolation, exact$2,450 responsibilities and saved zero-interest debt/due-date idempotency. The added iOS Item checkpoint is now historical and must not be used as an active baseline. This closes current-artifact iOS standard Link/import/sync/selected-unlink/provider-revocation checks. Forced-error recovery and reminder parity remain separate, as does the unresolved iOS Simulator OAuth flow. Android OAuth completion is not substituted for iOS proof.


### September18 — current iOS forced login-error recovery

Ran the existing guarded provider-reset helper inside the exact isolated Railway service against the original synthetic owner/Item, adapting only its synthetic-email allowlist from partner to owner for this invocation. Provider confirmed `reset_login=true`; no token or provider credentials left process memory. Native Sync now then showed **Could not sync**, **Needs relink**, and the incomplete-spending warning. Relink opened update mode for the existing First Platypus connection; public Sandbox password reauthentication succeeded, the14 accounts were confirmed, and finishing without phone storage returned **Connection repaired** with Healthy status. Screenshots `.tmp/ios-132-needs-relink.png` and `.tmp/ios-132-forced-repair.png`. One Maestro selector result incorrectly reported missing Finish without saving after the app had already returned; the actual native success dialog and persisted readback are the acceptance evidence.

Fresh full hosted verification passed both logins afterward: original owner account IDs and49 complete ledger records, partner15 accounts/392 records, repeat-sync stability, private manual/bill state, exact$2,450 shared responsibilities and zero-interest debt/due-date idempotency. This closes forced ITEM_LOGIN_REQUIRED recovery on updated iOS eb664bae/source1dd2196; it does not close Simulator OAuth.

Generalized `scripts/reset-hosted-sandbox-login.cjs` to allow either existing synthetic hosted owner or partner email shape, retaining exact project/environment/service, Sandbox-only, explicit opt-in, owned Item, encrypted token and in-memory provider guards. Console wording is now role-neutral. Syntax and five fail-closed invocations (wrong environment, wrong service, production Plaid, absent opt-in, missing fixture IDs) pass. No app runtime or production setting changed.


### September18 — updated iOS reminder delivery and logout privacy

On iOS eb664bae/source1dd2196 as synthetic Morgan, tapped Send test reminder, observed **Test reminder scheduled**, dismissed it and pressed Home through authorized Maestro. The OS delivered **Your test reminder** as a visible banner with Worthlane’s icon and generic no-payment text; screenshot `.tmp/ios-132-reminder-delivered.png` was inspected independently. This is actual background DATE-trigger delivery, not only scheduling or mocked adapter evidence. Returning to the app and choosing Check last test displayed **Test reached notification history** from the OS query (`.tmp/ios-132-reminder-history.png`).

Signed out through its confirmation, opened Notification Center and its history view, and observed no remaining notification. Reopened Worthlane and confirmed the blank email/password sign-in screen. Screenshots `.tmp/ios-132-notification-center-after-logout.png`, `.tmp/ios-132-notification-history-after-logout.png`, and `.tmp/ios-132-signed-out.png` preserve the result. The immediate `.tmp/ios-132-after-logout.png` was taken before asynchronous navigation settled and is not sign-out proof; use the later signed-out capture. No test alert was manually dismissed from Notification Center. Morgan’s stored bill reminders remain Off; this check verifies diagnostic delivery and delivered-history cleanup, not future calendar-time delivery or a queued Morgan bill cancellation. Prior Android queued-alarm cancellation evidence remains separate.


### September18 — updated Android repair and reminder acceptance

Shut down iOS and booted the preserved WorthlaneRelease AVD. The first launch exited with an explicit insufficient-disk fatal error (not merely an observation timeout). Losslessly compressed64 generated Maestro logs, saving523,578,631bytes, and removed inactive downloaded Gradle, Playwright-browser and Electron caches; screenshots, source, signing material, fixtures and databases remained. Inventory/restore instructions are in `.tmp/generated-output-cleanup.jsonl`. Disk free reached4.8GiB and the next AVD startup completed. No phone was accessed.

The installed Android APK’s SHA256 matched updated22734e79/source1dd2196 exactly: `5f291c2a34d7eba0228b10c0ed5a6fa0a971e626024e8da59de7ae4a9a78ed78`. Avery’s saved session and original First Platypus14-account connection recovered. Ran the committed guarded provider-reset helper against that synthetic partner/Item inside the exact isolated service; provider reset confirmed. Native Sync exposed **Could not sync**, **Needs relink**, and the incomplete-spending warning. Relink, public Sandbox password reauthentication, confirmation of the existing14 accounts and Finish without saving returned **Connection repaired**. Fresh full hosted verification retained owner49/partner392 complete ledgers, original account IDs, private fallback/bills, exact$2,450 responsibilities and saved debt/due-date idempotency. Screenshots `.tmp/android-132-needs-relink.png`, `.tmp/android-132-incomplete-bank-warning.png`, `.tmp/android-132-forced-repair.png`. A transient UIAutomator null-root response exposed stale-dump reuse in the local helper; it now removes the old remote dump before reading a new one. Later fresh UI and API state established repair success.

AlarmManager then showed exactly one Worthlane bill alarm for September20 at09:00 local, matching Avery’s September21 bill and one-day-before preference; its window remains one hour. The DATE test reminder arrived in the OS notification shade with the correct icon and generic no-payment text (`.tmp/android-132-reminder-delivered.png`). Native logout reached the empty sign-in screen (`.tmp/android-132-signed-out.png`). Full before/after OS dumps independently changed Worthlane scheduled alarms from1 to0 and notification records from1 to0; no shade Clear all action was used. Evidence files: `.tmp/android-132-alarms-before-reminder.txt`, `.tmp/android-132-alarms-after-logout.txt`, `.tmp/android-132-notifications-before-logout.txt`, `.tmp/android-132-notifications-after-logout.txt`. This closes updated Android forced repair, reminder delivery and queued/delivered logout cleanup. Actual future calendar-time delivery remains unobserved.

All four CI jobs passed on f484aa3 in run35382925334: full regression/typecheck/build, PostgreSQL17, PostgreSQL18 and Windows packaging. Both current mobile artifacts now have repair/reminder evidence; iOS Simulator OAuth, fully hosted/public Mac distribution and privacy/store preparation remain separate open gates. No production deployment or store submission occurred.

## September 18: Mac OAuth and hosted frontend isolation audit

The isolated packaged Mac app still recovered Morgan's authenticated session
against localhost3403 and the hosted Sandbox API. After a normal menu-based
quit/relaunch, Accounts showed the original Healthy14-account bank connection.
Connect bank displayed real Plaid Sandbox Link, and Chase reached its Continue
to login screen. The attempted handoff did not produce an observed bank-login
window. AX Exit also did not visibly respond; a coordinate fallback returned
Computer Use `noWindowsAvailable`. The app was quit normally through its native
menu. This is incomplete OAuth evidence, not a successful connection or proof
that a click reached the provider. No token exchange success was observed.

Source inspection found that `attachSecurityPolicy` denies every new window and
only permits same-origin main-window navigation. Plaid's official OAuth guide
says desktop web normally opens a popup, so this policy needs a focused diagnosis
and secure browser-handoff/popup design before Mac OAuth can pass. Do not loosen
navigation broadly or treat the tool failure alone as a proven product defect.
Reference: https://plaid.com/docs/link/oauth/
The existing19 native policy/navigation/packaging/recovery tests all pass; they
do not exercise an actual OAuth popup.

Fresh Vercel settings show `worthlane-desktop` API URL and proxy secret scoped
to both Production and Preview. Consequently, the existing branch preview must
not be used for synthetic Sandbox tests. A separate frontend or explicitly
isolated branch configuration is required. No secret values were revealed and
no Vercel settings changed. The team remains on Hobby; no paid plan was selected.
A future frontend must target only
`https://worthlane-beta-sandbox.up.railway.app/api` and use this Sandbox API's
proxy secret, never a production credential. Obtain approval for the exact new
secret destination and any shared Plaid redirect setting before saving them.

Fresh local signing inventory contains development/distribution identities but
no Developer ID Application identity. Public Mac signing/notarization therefore
remains open; an unrelated organization's distribution identity is not suitable.
The app's fail-closed Developer ID distribution guard remains unchanged.

## September 18: Mac OAuth popup fix and real Sandbox round trip

A separate local development harness copied the native runtime and logged only
popup protocol/host/path, never the query or tokens. Clicking Chase Continue to
login produced the denied request
`https://cdn.plaid.com/link/v2/stable/sandbox-oauth-login.html`. This positively
identifies the unconditional popup policy as a blocker, beyond the earlier
inconclusive Computer Use observations.

The native shell now allows only Plaid's exact Sandbox OAuth and OAuth entry
pages to create one child window. The child has no Node integration, preload or
webview privileges; retains sandbox/context isolation/web security; shares the
parent's permission-denying session; rejects non-HTTPS/credential-bearing
navigation; blocks nested windows and downloads; displays the current host in
its native title; and closes on parent navigation/sign-out/close. Main-window
navigation remains pinned to Worthlane.23 native tests and syntax checks pass,
including malicious entry URLs, child navigation, download denial and cleanup.

In the isolated development runtime with the new policy, actual Chase Sandbox
OAuth opened the bank window, accepted published test credentials and simulated
MFA, selected one checking account, completed simulated consent, closed the
bank window, returned to Link, and showed Connection saved in Worthlane. Fresh
API verification recovered one new account and148 imported transactions, with
all197 owner transactions unchanged by repeat sync and original49 records
unchanged. Avery's15 accounts and392 transaction IDs remained private and
unchanged. Screenshot `.tmp/mac-oauth-connection-saved.png` was visually checked.

Selected only the added Chase connection for unlink through the Mac UI. A guarded
Sandbox-only observer retained its token in memory, observed database deletion,
and received Plaid ITEM_NOT_FOUND. UI returned to15 accounts/one institution;
the complete two-login verifier then passed original owner49/partner392 rows,
private manual fallbacks,2450 responsibility totals and saved debt/due dates.

The final source also explicitly pins the child to the parent's session (the
successful development replay preceded that explicit pin). Built an isolated
ad-hoc arm64 package at `.tmp/mac-oauth-fixed/mac-arm64/Worthlane.app`;9 archived
assets,8 hardened fuses and strict/deep signature validation pass. ASAR SHA256:
`b6f630b914cb72796e3df7830b3ccb5b3d1fc78091d300e015a2138c44792a05`.
Its cold launch recovered Morgan's original dashboard/accounts/2450 plan. The
initial Computer Use observation timed out while its process stayed live;
reinspection succeeded without restarting. Full OAuth replay on this final
packaged artifact remains next, followed by repair/cancel cleanup checks.

This is actual Mac development-runtime OAuth success plus packaged launch proof,
not final packaged OAuth parity, fully hosted frontend or production-bank proof.
Existing production apps/services and store records were not changed. Public
Developer ID/notarization, isolated hosted frontend and iOS Simulator OAuth
remain open. Technical references: https://plaid.com/docs/link/oauth/ and
https://www.electronjs.org/docs/latest/api/window-open .

## September 18: final packaged Mac OAuth lifecycle passes

Rechecked exact ASAR SHA256 b6f630b914cb72796e3df7830b3ccb5b3d1fc78091d300e015a2138c44792a05
before testing the isolated arm64 package. Actual packaged Chase Sandbox OAuth
completed: child bank window, test credentials/MFA, one checking account,
simulated consent, automatic popup closure, Link return and Connection saved.
Fresh API readback found one new account/148 imports and197 exact owner records
stable through repeat sync; original49 rows and partner392 IDs stayed private
and unchanged. Screenshot: `.tmp/mac-packaged-oauth-saved.png` (visually checked).

The exact Sandbox-only provider helper reset the added Chase Item's login.
Packaged Sync exposed Needs Relink and incomplete-spending wording. Reconnect
opened a fresh bank window. Closing it and exiting Link restored Reconnect with
Bank linking closed; the Item remained Needs Relink. Retrying reopened the bank
window, completed simulated authentication/consent and returned to Healthy.
The repair verifier asserted the same Item/account/imported transaction IDs,
all197 records stable across another sync and unchanged partner privacy.

Selected only the added Chase connection for unlink. The in-memory provider
observer confirmed database removal and Plaid ITEM_NOT_FOUND; packaged UI
returned to15 accounts/one institution and Chase was unlinked. Full fresh-login
verification then passed owner49/partner392 ledgers, private100/125.50 manual
balances,2450 responsibilities and saved debt/minimum-payment records. No
original connection was removed. No real banking or production service changed.

All4 jobs in CI35386753487 passed on a0fe748: regression/builds, PostgreSQL17,
PostgreSQL18 and native Windows packaging. This closes the final local packaged
Mac OAuth/repair/cancellation/selective-unlink parity gap. Fully hosted frontend,
public signing/notarization and the remaining iOS/privacy/store gates stay open.

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

### Hosted desktop BFF acceptance runner

Run from the repository root after the isolated Vercel deployment is ready:

```sh
WORTHLANE_HOSTED_SANDBOX_APPROVED=true node scripts/test-hosted-desktop.mjs
```

This runner uses only the fixed approved `worthlane-beta-desktop.vercel.app`
origin and existing synthetic fixture; it cannot accept an arbitrary host. It
requires the desktop identity header before transmitting credentials. It checks
HttpOnly/Secure/host-only session cookies, anonymous and cross-origin denial,
saved two-login responsibilities/account IDs and complete disjoint ledgers,
access-cookie expiry recovery with refresh rotation, and server-side logout
revocation. Only its newly created sessions are logged out; no financial records
or provider connections are mutated. Tokens remain in memory. Browser rendering,
Plaid return and packaged Mac acceptance remain separate requirements.

September18: syntax check passed; actual hosted attempt stopped at `/login`
HTTP404 before credentials were sent. This is a fail-closed preflight, not a
claim that the full runner passed. Candidate Vercel deployment remains queued
during the provider outage. All4 CI jobs on preceding b995305 passed in
35396342603.

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

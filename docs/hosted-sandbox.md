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

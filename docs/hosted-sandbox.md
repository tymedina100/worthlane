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

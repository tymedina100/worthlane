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

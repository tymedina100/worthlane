# Production preparation — September 11, 2026

Tyler authorized starting Plaid production setup and store preparation, but
explicitly prohibited store submission. Spending still requires approval.
Laptop-only work remains binding. This supersedes the previous blanket Plaid
production-preparation gate, including necessary Android package registration.
Dashboard access and provider permissions still need verification.

## Verified state

- Desktop/iOS Simulator Sandbox lifecycle evidence remains in beta-progress.md.
- Android debug build succeeded in36m30s; APK installed on laptop emulator5554,
  boot completed and Metro loaded2079modules. Login screen rendered, but the first
  Jamie login returned Invalid credentials. Investigate input/session before
  claiming Android persisted-journey success. No phone operation.
- Apple record6766112205 is accessible, Prepare for Submission, manual release.
  Updated promotional text and couples-first description persisted after reload.
  Review notes edits did not persist after two save/reload attempts; the old
  manual-only notes remain and must be corrected before any submission.
- Tyler's embedded Plaid browser is signed in. Available automation uses a
  separate Chrome session, still at Welcome back. Production tier, permissions
  and pricing are unverified; no production secret was copied or activated.

## Plaid setup work remaining

1. Inspect the Vantage team's Launch Center, access tier and app/company profile.
   Do not invent security questionnaire answers or accept paid terms.
2. Register exact Android package com.worthlane.mobile. Preserve the approved
   worthlane.app/plaid-oauth redirect and existing integrations.
3. Verify Transactions access and optional Liabilities permission. Existing code
   requests Transactions and only adds Liabilities consent when requested. No
   payment/transfer product is needed.
4. Inspect existing hosting before selecting production API/desktop endpoints.
   Keep production database, JWT/proxy/cron/encryption secrets and provider
   credentials separate from the persistent local Sandbox. Do not migrate Sandbox
   Items or flip the test database into production.
5. Verify HTTPS webhooks, signature validation, sync/recovery and revocation against
   the selected service before live onboarding.
6. Resolve account-deletion failure handling: auth/account currently attempts
   provider revocation then deletes local data even when revocation fails. A
   durable retry or retryable failure path is needed before production onboarding.
7. Reconcile public privacy disclosures with actual enabled production services;
   verify support, backup/restore and final acceptance. Real bank connections
   require the account owner's consent. No real-bank credentials requested here.

## Release configuration

Preview/production mobile builds now require an HTTPS DNS API URL and reject
malformed URLs, local/emulator IPs, embedded credentials, queries and fragments.
Development routing is preserved. Three Node tests pass and are included in CI.
This proves configuration validation, not reachability or deployment.

## References

Plaid's old launch checklist now points to the personalized
[Launch Center](https://dashboard.plaid.com/developers/launch-center).
Check the account's actual tier before
[production access or paid upgrade](https://support.plaid.com/hc/en-us/articles/39917307426967-How-do-I-upgrade-from-the-Trial-plan-to-a-paid-Production-plan).
Store preparation is tracked in store-listing-draft.md; no store submission.


## Latest verification

Android Jamie sign-in succeeded after clearing/re-entering the password. Saved
balance/spending/bill/debt fields were read in the native UI; evidence is in
beta-progress.md. Earlier Invalid credentials is resolved as test-input failure.
Plaid Chrome access is now available. Vantage Launch Center explicitly reports
Production/real-data approval, but exact product access and billing are unverified.
Android registration is prepared and awaits Plaid password verification before
Save completes; the user has been asked to perform that identity check.

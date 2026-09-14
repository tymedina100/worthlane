# Production preparation — September 11, 2026

Tyler authorized starting Plaid production setup and store preparation, but
explicitly prohibited store submission. Spending still requires approval.
Laptop-only work remains binding. This supersedes the previous blanket Plaid
production-preparation gate, including necessary Android package registration.
Dashboard access and provider permissions still need verification.

## Verified state as of September 14

- Desktop, iOS Simulator and Android emulator have recorded Sandbox banking
  lifecycle evidence. Android standard Link, repeat sync, forced-error repair,
  provider-revoking unlink and OAuth connect now pass with persisted comparisons.
- Separate Android Morgan/Avery logins verify custom split persistence and privacy.
  CI112 on executable commit b85d3da passed all three jobs.
- Android package com.worthlane.mobile was saved in Plaid; fresh Sandbox Link-token
  requests succeed. The previously approved HTTPS iOS redirect remains recorded.
- Apple record6766112205 previously showed Prepare for Submission/manual release.
  Promotional text/description persisted; private review notes still require correction.
- Provider sessions restored September14: in-app Plaid Vantage and Apple draft are
  signed in; Mac native inventory is available again.
- Plaid Products shows Transactions Enabled (54/200 displayed) and Balance Enabled
  (0/200 displayed); these counters are recorded without inferring their time window.
  Liabilities is available to select but is not marked enabled. Selection was
  cleared; Add products was not clicked and no entitlement was changed.
- Plaid Plans explicitly identifies current Pay As You Go, no monthly minimum,
  month-to-month commitment. Billing lists active Transactions at $0.30 per
  Item/month and Balance at $0.10 per call. Do not infer live usage is free or that
  any additional product is included. No plan/payment changes or paid calls made.
- Apple corrected private review notes and candidate keywords now saved after
  Tyler supplied the required private review contact. Reload plus visual inspection
  verified persistence; manual release and Prepare for Submission remain. No
  contact values are stored in repo evidence. Reviewer login/build/screenshots and
  final release/privacy configuration remain pending.

## Plaid setup work remaining

1. Pay As You Go tier and active Transactions/Balance rates verified. Continue
   app/company profile and institution requirements review.
   Do not invent security questionnaire answers or accept paid terms.
2. Completed: exact Android package com.worthlane.mobile registered. Preserve the
   approved worthlane.app/plaid-oauth redirect and existing integrations.
3. Transactions is enabled; optional Liabilities remains unenabled. Existing code
   requests Transactions and only adds Liabilities consent when requested. No
   payment/transfer product is needed.
4. Inspect existing hosting before selecting production API/desktop endpoints.
   Keep production database, JWT/proxy/cron/encryption secrets and provider
   credentials separate from the persistent local Sandbox. Do not migrate Sandbox
   Items or flip the test database into production.
5. Verify HTTPS webhooks, signature validation, sync/recovery and revocation against
   the selected service before live onboarding.
6. Account deletion now returns a retryable503 and retains local data/tokens when
   revocation fails; ITEM_NOT_FOUND is accepted during retry. Seven focused tests
   and a persistent manual-only delete/relogin check pass. Production-service
   end-to-end revocation remains part of launch verification.
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


## Release-specific limits

No production bank Item, live-data migration, paid plan or store submission has
been made. Production requires verified entitlements, separate hosted API/data
and secrets, release-service deletion/webhook checks, truthful disclosures and
store signing/assets. Opaque Android notification resources have been regenerated from the transparent
brand mark; rebuilt APK and actual delivered-banner verification remain pending.
See [completion audit](beta-completion-audit.md) for the current evidence boundary.

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

### September 14 — existing hosting located and institution gates inspected

Vercel worthlane is rooted at apps/web. worthlane-desktop production is Ready on
main10cd6fa (PR14); beta-acceptance preview is Ready. Desktop has WORTHLANE_API_URL
and WORTHLANE_DESKTOP_PROXY_SECRET configured for Production and Preview; secret
values were not revealed. Railway existing GitHub sign-in succeeded. Worthlane
project a2386fda-ce79-4de5-b8c5-aef7ec8e8e3e contains online API and PostgreSQL.
API service f0d862bc-2bce-4ac1-b507-2639d3eb0cb4 exposes
https://financeapi-production-1853.up.railway.app and active deployment
dbd7cf1f-7794-4ddd-88c1-3ae5c76451f2 is the PR13 foundation; PR14 was skipped
for unchanged watched files. Dashboard status is hosting evidence, not a current
candidate deployment or end-to-end production acceptance. No deployment, database
read/write, migration, environment edit or plan purchase was performed.

Plaid institution view: Capital One requires legal entity name; PNC and Navy
Federal disabled for inactivity; Schwab/Fidelity access available on request.
User confirmed personal operation and exact legal name. Entered authorized name
in existing company profile; Save triggered password verification, so persistence
is pending the user's authentication. No LLC claimed and no institution-access
request submitted. Continue API configuration/signing/assets preparation.

User completed Plaid password verification. Legal entity name persisted after
reload with Save disabled. Capital One changed from missing legal entity name
to In review. This is provider review pending, not enabled institution access.

## Prepared deployment gate

Candidate adds uncached database readiness at /api/health and configures Railway
to wait up to120 seconds before promoting it. Shared packages/root build inputs
are now included in candidate watchPatterns. This is tested locally, not deployed.
Live Wait for CI is currently off; enable it as part of the reviewed release
settings. Existing Nixpacks/config-as-code deprecation needs a planned migration.
Healthchecks establish startup/database connectivity only, not complete schema,
provider or user-journey acceptance. Source: [Railway configuration reference](https://docs.railway.com/config-as-code/reference).

## Hosted Plaid configuration gap — September 14

Read-only Railway inspection shows PLAID_ENV is already production. Credentials
are present by variable name, but their values/validity were not inspected and no
provider request was made. This is existing configuration, not activation by this
work. The legacy PLAID_REDIRECT_URI points to the Railway /api/plaid/oauth-return
path, but current code reads the platform-specific names below. All four names
are absent from the13 visible service variables.

Prepare these non-secret settings for a separately approved deployment:

| Name | Proposed value | Verification needed |
| --- | --- | --- |
| PLAID_IOS_REDIRECT_URI | https://worthlane.app/plaid-oauth | Existing approved Plaid allowlist and native association; final signed build return |
| PLAID_ANDROID_PACKAGE_NAME | com.worthlane.mobile | Registered package; final release Link return |
| PLAID_WEB_REDIRECT_URI | https://worthlane-desktop.vercel.app/dashboard/plaid-return | Add exact production web allowlist and validate OAuth return |
| PLAID_WEBHOOK_URL | https://financeapi-production-1853.up.railway.app/api/plaid/webhook | Signed webhook delivery and retry behavior on selected release |

Do not point Sandbox acceptance clients at this service. Desktop preview has
Production/Preview API variables; preview isolation must be verified before any
interactive account creation there. The local persistent Sandbox remains the
authorized integration environment.

Compared candidate to the deployed PR13 SHA45e67d14ccf055c284d132d119f35a2e901a3778:
only new database migration is20260910000100_household_account_matches, creating
an additive table, two indexes and account/household foreign keys. This source
comparison does not prove current hosted migration state, backups, or safe
rollback. Verify those before approving deployment; the start command applies
migrations automatically. Keep existing production encryption/auth secrets.

## Plaid app profile resolved; security attestations outstanding

Fresh App profile tab shows Worthlane, https://worthlane.app, updated data-use
description and an icon, with Save disabled and no action-count badge. These
fields persisted. Overall Action required remains on Compliance Center. Data
security screenshot shows questionnaire last completed March8,2026 and17 required
attestations dated September9,2026:

- Zero trust access architecture; vulnerability scanning; role-based access control.
- Information Security Policy; periodic access reviews/audits; secure tokens/certificates.
- Automated employee access deprovisioning/modification.
- Consumer-facing MFA; internal-system MFA.
- Published privacy policy; consent tracking; deletion/retention policy.
- Centralized identity/access management; end-of-life software management.
- Documented access-control policy; encryption at rest; vulnerability patch SLAs.

Under the owner's explicit authorization to attest only when true, the published
privacy-policy attestation was submitted after inspecting the live policy and
the exact statement. Plaid shows it as Attested. Zero trust was already shown as
Attested before that action; this work did not submit or verify that control.
The other 15 attestations remain outstanding. Existing application consent,
deletion and encryption code are partial evidence, not organization-wide control
verification. Consumer MFA is not evidenced by the inspected auth/schema sources.
Assess actual implementation, service settings and owner procedures before making
any certification. Solo ownership does not automatically satisfy or exempt the
listed controls. Do not copy sensitive profile contact fields here.

The vulnerability-scanning drawer explicitly discusses employee/contractor
machines and production assets, with regular automated scans recommended. The
repository dependency audit does not establish that broader coverage. Do not
attest on the strength of a pnpm audit alone.


## September 15 — Production backup gate and local restore rehearsal

Read-only Railway UI confirms the existing Hobby workspace gates managed backups
and PITR behind Pro. Plan UI lists a $20 monthly minimum with $20 usage credits,
plus metered usage beyond credits. Owner approval requested; no upgrade or backup
mutation was performed. The production Postgres service uses the postgres-ssl:18
image. No independent production backup or recovery point has been verified.

Current API remains on the PR13 deployment; main auto-deploy is enabled, Wait for
CI is off, and no healthcheck path is configured. Startup applies migrations
before starting the API. A future approved rollout must account for those facts,
not assume the candidate's healthcheck/watch settings already apply.

`python3 scripts/rehearse-sandbox-backup.py` exercised the existing local synthetic
PostgreSQL17 database on port55439. It took a custom-format dump, restored to a
new randomly named test database with a single transaction and exit-on-error,
compared all29 table counts/content fingerprints (1,613 rows), and verified no
unvalidated public constraints. Source fingerprints before/after the dump agreed.
The temporary restore database was removed; the private0600 dump/report remains
in .tmp/worthlane_restore_test_b39d7e2798bb4bc0. Dump SHA256:
84961e2d79a3dfd13d53ec1d5f146c2bb732afff9541a286685dc5618fb8474b.

This script intentionally hardcodes loopback and the synthetic database name,
never reads DATABASE_URL, and cannot be used for production backup. The rehearsal
proves the local procedure and data comparison, not PostgreSQL18 production
backup, encryption, retention, restore timing, or off-site availability. Those
must be verified separately before a production migration.


### Approved Pro upgrade completed

Tyler explicitly approved upgrading the existing workspace. The confirmation
showed an immediate$20 charge; after applying it, Plans shows Pro active. This
approval covered the plan change, not production deployment or database migration.
The now-visible Backups page exposes one existing Pre-Security-Patch Backup,
24 days old and117MB, with no schedule and PITR off. Daily6-day/weekly27-day
retention is staged without saving; scoped backup creation/schedule approval is
pending. Enabling PITR would redeploy Postgres and has not been attempted.
Incremental volume backup storage is billed like volume storage; see
[Railway backup documentation](https://docs.railway.com/volumes/backups).


## September 15 — Production migration history verified read-only

Railway Pro is active following Tyler's scoped approval. The production
_prisma_migrations table shows 24 records across three pages, each with a
finished timestamp and one applied step. The latest named migration is
20260909142000_bank_identity. The candidate contains those 24 migrations plus
20260910000100_household_account_matches. Its SQL adds HouseholdAccountMatch,
a sorted-pair check, foreign keys, and two indexes; it does not rewrite existing
financial rows. Historical checksums were not independently compared.

Only migration metadata and table names were inspected. No production data,
schema, deployment, backup schedule, or PITR setting was changed during this
check. Daily/weekly backup scheduling and a fresh snapshot remain prepared but
unsaved pending separate metered-storage approval. After backup verification,
prepare the exact release and migration approval; do not infer deployment
permission from the Pro upgrade.

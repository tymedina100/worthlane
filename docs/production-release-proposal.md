# Reviewed candidate deployment proposal

Candidate: PR15, 569421f3bbcd7247a517f6d72f060ad7f973c122.
CI162 /34994653500 passed all four jobs: ci, native-windows, and PostgreSQL17/18 integration.

Proposed scope:
- Enable Railway Wait for CI, then merge the reviewed candidate to main.
- Allow connected Railway API and Vercel desktop/public-site production builds.
- Apply the single additive HouseholdAccountMatch migration via existing API startup.
- Verify promoted API /api/health and public/login routes without creating real-bank Items.

Prerequisites: fresh 117 MB production volume snapshot 2026-09-15 09:20 available;
daily6-day/weekly27-day schedule saved. PostgreSQL17 and18 migrations/persisted
household checks pass in CI162. Existing production JWT/encryption/provider
secrets must remain intact. Preserve production database and do not import local
Sandbox data.

If service readiness fails, halt further promotion and inspect deployment logs;
use prior API deployment as application rollback, leaving the additive table in
place. Do not restore a volume automatically, because that discards later writes.
The snapshot has not been restored against production as a test.

This scope does not include provider flag/redirect changes, new bank connections,
Liabilities activation, paid mobile builds, PITR, database restore or store
submission. Hosted end-to-end authenticated acceptance still needs an explicitly
isolated test environment; do not test synthetic accounts against live data.

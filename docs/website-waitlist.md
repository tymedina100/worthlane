# Website beta email list — September 10, 2026

Prepared for publication; **not deployed**. Existing production remains the
approved redesign, release commit 6a0ddb2. Preview: http://localhost:3315/#beta.

## Behavior and evidence

- The homepage and navigation lead to an email-only signup with an unchecked,
  required consent checkbox. Responsive forest/cream styling, visible labels,
  keyboard controls, saving state, polite confirmation, and announced errors.
- POST /api/beta saves normalized emails, consent version, and timestamp in a
  separate PostgreSQL database. Concurrent retries use a unique primary key;
  duplicate and new submissions receive the same response. No public list API.
- Same-origin JSON requests, bounded streaming body, honeypot, parameterized
  SQL, and database-backed five-attempt hourly rate limit. The address is keyed
  with a server secret and rotates hourly; expired buckets are removed on writes.
  This is basic abuse protection, not a guarantee against distributed bots.
- No signup email is sent and addresses are not email-verified. No financial
  account is created. Do not import this list as verified subscribers. Before
  sending invitations, honor removals and include removal instructions in each
  email. The current removal channel is support@worthlane.app.
- Production build and TypeScript checks passed. Real local PostgreSQL checks
  passed: consent/email validation, wrong origin, oversized payload, honeypot,
  five concurrent case/whitespace variants producing one row, consent evidence,
  rate limiting, and simulated missing table returning 503 instead of success.
- Actual browser submitted signup-ui@example.com and displayed confirmation.
  Database contained exactly one row with expected consent. Stopped and restarted
  Next: row persisted. Private CSV export produced one row with mode 0600;
  removal command deleted it, leaving zero contacts. Only synthetic data used.
- Mobile 390px and 320px document widths matched viewport; no horizontal overflow.
  Screenshots: docs/evidence/website-waitlist/{success,mobile,mobile-form}.png.
- No API application database migration, Plaid change, production deployment,
  contact export, real email delivery, or spending occurred.

## Release preparation

The Vercel website project currently has **no environment variables or configured
database**. Approval is required to connect a separate production waitlist database
and publish. Proposed provider: Neon Free, with no paid upgrade or spending.
Check the actual plan in the account before provisioning; stop if it requires payment.

1. Create a dedicated `worthlane-waitlist` database on the Free plan, separate from
   financial account data. Keep TLS enabled (`sslmode=require` in connection URL).
2. Privately set WAITLIST_DATABASE_URL and a random 32+ character
   WAITLIST_RATE_SECRET on the website Vercel project's production environment.
   Do not expose either via NEXT_PUBLIC variables or commit them.
3. With the new database URL in the shell environment, from apps/web execute
   `node scripts/waitlist.mjs init`. Only the two website-specific tables are created.
   For least privilege, use a separate runtime database role with SELECT/INSERT on
   beta_waitlist and SELECT/INSERT/UPDATE/DELETE on beta_rate_limits.
4. Build and deploy the approved website release worktree. Verify actual same-origin
   browser signup with a synthetic address, database persistence, duplicate handling,
   and cleanup. Verify existing AASA and /plaid-oauth routes remain unchanged.
5. Rollback website: prior READY deployment dpl_HgwZAmoLmcwZk8rV5MLFFdskEE2P.
   Preserve the waitlist database during rollback; do not delete collected contacts.

## Private list management

Use an owner connection in WAITLIST_DATABASE_URL for administrative operations.
Do not paste database secrets in chat, logs, or issue descriptions.

- Export: `node scripts/waitlist.mjs export /private/new-file.csv`. The output
  refuses overwrites, uses owner-only permissions, and escapes spreadsheet formulas.
  Keep exports outside Git. There is no email-sending integration in this release.
- Remove: `node scripts/waitlist.mjs remove`, passing the requested email on stdin.
  Confirm control of the signup address through the support request before removal.
- Test only on a dedicated local database:
  `node scripts/test-waitlist.mjs` with WAITLIST_DATABASE_URL and optional
  WAITLIST_TEST_ORIGIN set. The test temporarily renames its table to verify failure.
  Never run it against shared development data or production.

## Remaining beta goal

The full app goal remains active. Native branding changes are preserved in the beta
worktree. Native Plaid entitlement/dashboard configuration, complete live Sandbox Link
recovery walkthroughs, and actual reminder delivery remain open acceptance work.

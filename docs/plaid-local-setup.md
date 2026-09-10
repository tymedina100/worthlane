# Plaid Sandbox development and iOS return setup

## Persistent local session

Use the isolated PostgreSQL test database, with Sandbox credentials already stored in ignored `apps/api/.env.local`:

```sh
WORTHLANE_TEST_DATABASE_URL=postgresql://worthlane_test@127.0.0.1:55439/worthlane_beta_test node scripts/dev-sandbox.mjs
```

This starts API port 3301 and desktop port 3303. Mobile uses `EXPO_PUBLIC_API_URL=http://localhost:3301/api`. Enable the installed native Plaid module with `EXPO_PUBLIC_PLAID_ENABLED=true`. The launcher rejects non-local databases and non-Sandbox configuration. It keeps generated JWT, encryption and proxy keys in ignored `.tmp/sandbox-development-secrets.json` with mode 0600. Keep that file with the local database; losing the encryption key prevents reopening existing connections. Stopping the servers retains connections; remove them through the app's unlink action. Do not use this launcher for production or expose its ports publicly.

`test-http.mjs --interactive --sandbox` is different: it creates temporary connections and revokes them on completion. It now removes their local account/transaction records too. Existing records from older test runs are not silently deleted; they may reference previously revoked Sandbox Items. Use a fresh synthetic login for persistent testing until those old fixtures are cleaned up.

## iOS association — approved website routes published

The user confirmed ownership of `worthlane.app`. The local personal Apple Development certificate has organizational unit/team ID `5FBXR5M5PJ`. This does not prove paid-program membership or entitlement availability. Do not use the separate company signing identity for Worthlane without user direction.

Prepared files:

- `apps/web/public/.well-known/apple-app-site-association`: exact application ID `5FBXR5M5PJ.com.worthlane.mobile`, only `/plaid-oauth`.
- `apps/web/app/plaid-oauth/route.ts`: minimal return instructions, no scripts/analytics, no reflected query parameters, no-referrer and restrictive CSP.
- `apps/web/next.config.ts`: JSON content type for the association file.

Before native OAuth acceptance:

1. Verify the personal team's membership supports Associated Domains and confirm the signed app's actual application identifier prefix matches the prepared file.
2. Completed: the user approved and published the website association/return routes, full redesign, and beta signup. Do not request these approvals again. New production changes still require scoped approval.
3. Verify HTTPS 200, JSON content type and no redirects at `https://worthlane.app/.well-known/apple-app-site-association`.
4. Register `https://worthlane.app/plaid-oauth` in the Plaid dashboard's allowed redirect URIs. Set API `PLAID_IOS_REDIRECT_URI` to that exact value and mobile `PLAID_IOS_ASSOCIATED_DOMAIN=worthlane.app`.
5. Rebuild the signed native app with the associated-domains entitlement. Test ordinary Link plus Sandbox OAuth App2App (`ins_132241`), reconnect, failure recovery, sync and unlink. A browser return page alone does not prove successful bank connection.

On September 10 the user approved publishing only the website association and return routes. Isolated release commit a48cb06 was based on the then-live 10cd6fa plus only these three files. Vercel deployment dpl_6Fdf3WDxt6TjD4oE235MRatCv9VB is READY in production at worthlane.app. Public HTTPS checks passed both routes without redirects, exact association app/path and JSON content type, script-free callback with no reflected query values, no-referrer/CSP, and homepage 200. Apple’s association CDN also returns the expected app ID. Dashboard registration, Worthlane app entitlement validation and native OAuth remain pending. The release source is pushed on codex/plaid-return-release; preserve these files in future website releases. No API/database deployment or production Plaid activation was performed.

Sources: [Plaid iOS setup](https://plaid.com/docs/link/ios/), [Plaid OAuth testing](https://plaid.com/docs/link/oauth/), [Apple associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains).

## Repeat the persisted-bank check

With the persistent launcher running, execute `node scripts/test-persistent-sandbox.mjs --create`. Stop and restart the launcher, then execute `node scripts/test-persistent-sandbox.mjs --verify`. This creates a synthetic login and real Sandbox connection, stores its fixture credentials only in ignored mode-0600 `.tmp/persistent-sandbox-fixture.json`, and verifies fresh login, unchanged account IDs, token decryption and successful bank sync after restart. It retains that connection for continued UI acceptance; do not run the create phase again over an existing fixture. This backend persistence check does not substitute for interactive Link or OAuth evidence.

## September 10 physical-device prerequisite check

The paired iPhone16ProMax is available and Developer Mode is enabled. An actual
Debug device build was attempted with the personal team5FBXR5M5PJ and automatic
provisioning. Xcode failed before installation with:

- `No Accounts: Add a new account in Accounts settings.`
- Cached `iOS Team Provisioning Profile: *` does not support Push Notifications.
- That profile lacks `aps-environment`.

This proves the currently available signing setup cannot install this build. It
does not establish whether the user's individual developer membership can create
the required profiles. Sign into the personal developer account in Xcode Settings
→ Accounts, then refresh/create an app-specific Worthlane development profile.
Keep the correct personal team, and verify Push Notifications and Associated
Domains before claiming native Plaid OAuth readiness. Do not remove required
capabilities solely to make the acceptance build pass or switch to a company team.

No device app was installed by this failed attempt. The simulator build and real
foreground/background10second local-reminder evidence remain valid. A phone build
also needs a device-reachable Sandbox API address; the current persistent API binds
to127.0.0.1:3301 and must not be mistaken for a phone-accessible localhost URL.

Plaid dashboard remains at sign-in. Chrome's banking check was blocked by an open
extension UI; the Computer tool explicitly requires it to be completed/dismissed
before automation resumes. No extension UI was bypassed.

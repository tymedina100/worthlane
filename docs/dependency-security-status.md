# Dependency security review — updated September 25, 2026

This is a dependency/caller review, not a certification of organization-wide
security controls. The original production dependency audit reported60high,
24moderate and3low findings. Compatible upgrades removed most findings. The latest registry audit reports zero high/critical and four moderate findings
after the image-size 2.0.3 migration below. No advisory ignore was added.

| Remaining package | Caller and disposition | Evidence / limit |
| --- | --- | --- |
| image-size2.0.3 (high findings cleared) | Metro uses the fixed upstream parsers. A small CommonJS adapter preserves its synchronous byte/filename calls. | `patches/image-size@2.0.3.patch`; tests cover all three reachable Metro versions, real images, file-backed metadata, and malformed image termination. |
| decode-uri-component0.2.2 | Expo Router → query-string. Backported upstream0.5 bounded decoding while retaining CommonJS/plus semantics. | Original version timed out on the synthetic malformed query; patched actual caller passes Unicode/plus/repeated-key/malformed-input tests. Registry warning retained. |
| fast-xml-parser4.5.5 | React Native Android CLI `getMainActivity` uses XMLParser/XMLValidator on AndroidManifest.xml, not XMLBuilder. The remaining finding concerns XMLBuilder comment/CDATA serialization. | Inspected installed caller; affected operation not found in this path. This does not declare every possible use safe. Revisit if builder use is introduced. |
| uuid7/9 | Xcode project generation and Sentry Webpack plugin call v4 without a caller-provided output buffer. The advisory concerns v3/v5/v6 with a buffer. | Inspected `xcode/lib/pbxProject.js` and `@sentry/webpack-plugin/dist/cjs/index.js`; vulnerable operation not used by these callers. Revisit with dependency/caller changes. |

CI247/35646773858 atb75245c passed all four jobs: PostgreSQL17/18, Linux
typechecks/tests/mobile export/all server builds, and Windows packaging. This
includes the decoder and Metro image regressions on Linux. Existing signed iOS build29 predates the router
JavaScript patch and must not be described as containing these changes.

Next: verify current CI, refresh candidate parity, and continue the separate
platform/privacy/reviewer gates. Dependency work does not prove employee-device
scanning, centralized identity, consumer MFA or other outstanding Plaid claims.

## September 22 candidate recheck

`corepack pnpm audit --prod --json` again reports 2 high/4 moderate, zero critical
findings. `node --test scripts/test-router-query-decoder.mjs
scripts/test-metro-image-parsers.mjs` passes all four tests against the installed
actual callers. This confirms the documented mitigations remain present; it does
not remove the registry findings or certify unrelated security controls.

## September 25 refresh and upstream compatibility check

At source `26617f1`, CI330 ([run 36163873280](https://github.com/tymedina100/worthlane/actions/runs/36163873280)) completed all four jobs successfully, including PostgreSQL 17/18 persistence, mobile diagnostics/reminders, parser regressions, mobile bundle, server builds and Windows packaging. This is not native OAuth or calendar delivery acceptance.

A fresh `corepack pnpm audit --prod --json` still reports 2 high/4 moderate and zero critical findings (expected nonzero exit). The two image-size advisories were updated September 24 and now list upstream 2.0.3 as patched:
[ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) and
[JXL/HEIF](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq).
The former statement that no patched range exists is superseded.

Inspected the official npm 2.0.3 package in an isolated temporary directory without changing the workspace install. Its CommonJS export is an object containing `imageSize`/`default`; calling the export itself throws. Existing Metro callers expect a callable CommonJS export. Therefore a blind major-version override is not compatible; a future upstream migration must adapt and verify the actual callers and mobile bundling. Existing local patches remain in place with no advisory suppression.

`node --test scripts/test-router-query-decoder.mjs scripts/test-metro-image-parsers.mjs` passes all four tests again: real PNG/AVIF/ICNS dimensions, malformed ICNS/JXL/HEIF termination, and normal/malformed router queries. No production deployment or dependency mutation was performed. Evidence: `evidence/2026-09-25/dependency-refresh.json`.

## September 25 upstream parser migration

Supersedes the earlier decision to defer migration. All Metro image-size edges
now resolve to 2.0.3. Replaced the old parser backports with a CommonJS adapter
that keeps the callable default and synchronous filename inputs used by Metro;
the upstream parser implementations are unchanged. Named `imageSize` and ESM
exports keep the upstream byte-input API. No asynchronous filename API is added.

Expanded the actual-caller regressions to Metro 0.83.1, 0.83.3 and 0.83.5,
including file-backed asset metadata (missed by the former buffer-only coverage).
All eleven parser/router tests pass. Frozen install and the full iOS export
(1,958 modules, 42 assets) succeed. A fresh production
audit reports zero high, zero critical and four moderate findings; the moderate
dispositions above remain applicable. This is dependency evidence, not native
banking acceptance, organization-wide security certification or deployment.

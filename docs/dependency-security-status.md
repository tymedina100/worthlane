# Dependency security review — September 21, 2026

This is a dependency/caller review, not a certification of organization-wide
security controls. The original production dependency audit reported60high,
24moderate and3low findings. Compatible upgrades removed most findings. The
registry still reports2high/4moderate because it evaluates package versions,
including locally patched packages. No advisory ignore was added.

| Remaining package | Caller and disposition | Evidence / limit |
| --- | --- | --- |
| image-size1.2.1 (two high findings) | Metro build-time asset dimensions. Content sniffing means a renamed PNG can reach ICNS/JXL/HEIF parsers. Locally patched ICNS entry lengths and ISO box progress/header bounds. | `patches/image-size@1.2.1.patch`; actual Metro tests reject malformed buffers within child deadlines and preserve real PNG/AVIF and ICNS dimensions. Frozen install and iOS export pass. Registry has no patched range; it will still flag this version. |
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

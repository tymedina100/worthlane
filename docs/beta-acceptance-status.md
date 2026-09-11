# Beta acceptance status — September 11, 2026

Source of requirements: [Worthlane brief](https://app.notion.com/p/3d57f32d407581d9a9eafcdb4d5ac152).
Candidate: [draft PR15](https://github.com/tymedina100/worthlane/pull/15).
The beta is **not complete**. This index separates evidence already recorded from
the interactive banking gate still open. Detailed chronology and exact commands
are in [beta-progress.md](beta-progress.md).

| Required outcome | Evidence and remaining limit |
| --- | --- |
| Solo onboarding; invitation before partner registration; separate consenting logins; maximum two members | `apps/api/integration/household.test.ts` and `scripts/test-http.mjs` exercise registration, invitation token replacement/acceptance, access before consent, third-user rejection, fresh sessions and persistence. Latest fresh isolated PostgreSQL and HTTP run passed. Recorded desktop solo and native second-login journeys are in the progress log. |
| Owned, equal and custom category responsibilities; 600/150/1700 fixtures; cents/refunds/history | The persisted household test creates the exact brief fixtures, verifies fresh-login allocations, privacy-filtered activity and versioned agreement history. Shared finance tests cover allocation extremes and rounding. Recorded desktop/native category and two-login reads supplement those tests. Responsibility is independent of the payer. |
| Plaid connect/reconnect/sync/recovery/unlink on supported beta clients | **Incomplete.** Real Sandbox backend persistence and full interactive desktop connect/sync/reconnect/forced-error recovery/unlink passed. Before unlink14 accounts/392transactions remained stable; unlink removed only Avery imported data, persisted after reload, and revoked provider access. Separate Morgan login excluded Avery personal bank accounts. Native app built and installed with verified personal app ID, development push and associated-domain entitlement; actual native OAuth returned from First Platypus, completed consent and saved the selected checking account plus149 imported transactions. Native ordinary sync and required OAuth repair after forced expiration also passed; saved Item/account/transaction IDs remained identical (2 total accounts/150 transactions, including the original manual fixture). Repeated Healthy-to-error transition also passed with immediate repair feedback and retained balance. Native Unlink removed the selected bank imports and revoked provider access; exact IDs of manual data and the other login’s banking data were preserved. Cold restart retained the unlink, original100 net worth and10 spending, and saved upcoming bills. App2App remains pending. Local Maestro/XCTest access is working; phone work is excluded per Tyler's direction. |
| No double counting; truthful freshness and coverage | Persisted tests cover added/modified/removed/pending changes, transfers/card repayments, manual/import review, one-owner duplicates and bilateral account-match consent/revocation with viewer-specific privacy. Actual two-login match/revoke totals were recorded on desktop and native. Full interactive banking lifecycle remains necessary. |
| Reliable obligations; distinct card fields; manual fallback; estimated recurrence labels | Persisted HTTP checks cover bill edits, payment state, stale updates and partner isolation. Actual native bill recurrence/reminder save and debt-minimum conversion/reopen are recorded. Liabilities data is separate from manual confirmation and recurring predictions. Real foreground banner and background OS-history presentation are proven for the simulator test reminder; native adapter tests cover due-date scheduling and session isolation. |
| Explainable, saved avalanche/snowball debt estimates | Shared deterministic debt tests cover zero APR, promo transitions, insufficient/non-amortizing payments and cents. Persisted debt tests verify current/statement/minimum/due fields, owner isolation, saved estimates and revision conflicts. Desktop and native preview/save/edit/reopen/payment-guidance interactions are recorded. No automatic payments/transfers. |
| Regression assurance and reviewable candidate | PR15 runs PostgreSQL, shared/client/API tests, mobile export, API/desktop/web builds and Windows packaging. Run96 exposed a too-small Windows icon;9f2175b fixes the source and adds a dimension check. Run98/34525382333 on code commit4637de3 passed all three jobs, including Windows packaging and the failed-bank-operation refresh regression. Run99/34635576604 on2eeb062 also passed all three jobs after native expired-session cleanup and protected-route changes, including nine auth/privacy checks. Run100/34638570386 on78b2ee8 also completed successfully after the explicit Apple-team configuration correction. Run101/34640584603 on45b97ea and run102/34641852325 on87d6156 subsequently passed all jobs, covering native bank-return routing and failed-operation refresh. This regression gate passes for the latest pushed code revision. |
| Aesthetic app and full website; beta email list | Website redesign and persisted consent-based signup are live with scoped user approval; production browser signup/dedup/cleanup verified. Native forest/cream branding was built, installed and visually checked on the simulator. See `website-waitlist.md` and evidence images. Automated marketing emails are not part of the signup implementation. |

## Completion boundary

Do not convert this draft into a completed beta merely because CI passes. Finish
the supported-client Sandbox lifecycle, reconcile any remaining interactive gaps
against the brief, and review current evidence before marking the goal complete.
Physical-device installation is additional release evidence and is required before
claiming phone readiness; it is not a substitute for the brief's core journeys.
Likewise, do not add follow-on forecasting or gamification to extend this goal.

Existing production website approvals are fulfilled. No approval exists here to
deploy the financial API, migrate live financial data, enable production Plaid,
purchase services, merge/release automatically, or submit an app to a store.

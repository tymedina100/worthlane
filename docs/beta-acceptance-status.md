# Beta acceptance status — September 10, 2026

Source of requirements: [Worthlane brief](https://app.notion.com/p/3d57f32d407581d9a9eafcdb4d5ac152).
Candidate: [draft PR15](https://github.com/tymedina100/worthlane/pull/15).
The beta is **not complete**. This index separates evidence already recorded from
the interactive banking gate still open. Detailed chronology and exact commands
are in [beta-progress.md](beta-progress.md).

| Required outcome | Evidence and remaining limit |
| --- | --- |
| Solo onboarding; invitation before partner registration; separate consenting logins; maximum two members | `apps/api/integration/household.test.ts` and `scripts/test-http.mjs` exercise registration, invitation token replacement/acceptance, access before consent, third-user rejection, fresh sessions and persistence. Latest fresh isolated PostgreSQL and HTTP run passed. Recorded desktop solo and native second-login journeys are in the progress log. |
| Owned, equal and custom category responsibilities; 600/150/1700 fixtures; cents/refunds/history | The persisted household test creates the exact brief fixtures, verifies fresh-login allocations, privacy-filtered activity and versioned agreement history. Shared finance tests cover allocation extremes and rounding. Recorded desktop/native category and two-login reads supplement those tests. Responsibility is independent of the payer. |
| Plaid connect/reconnect/sync/recovery/unlink on supported beta clients | **Incomplete.** Real Sandbox backend exchange/sync/token persistence after restart passed. Transaction lifecycle and manual/joint deduplication have persisted regression coverage. Desktop Link timeout/cancel and native SDK build are proven, but they do not prove a successful complete interactive Link/relink/unlink journey or native OAuth return. Dashboard sign-in/redirect registration and native account/profile setup are required. Chrome's extension UI also blocks its current automation attempt. |
| No double counting; truthful freshness and coverage | Persisted tests cover added/modified/removed/pending changes, transfers/card repayments, manual/import review, one-owner duplicates and bilateral account-match consent/revocation with viewer-specific privacy. Actual two-login match/revoke totals were recorded on desktop and native. Full interactive banking lifecycle remains necessary. |
| Reliable obligations; distinct card fields; manual fallback; estimated recurrence labels | Persisted HTTP checks cover bill edits, payment state, stale updates and partner isolation. Actual native bill recurrence/reminder save and debt-minimum conversion/reopen are recorded. Liabilities data is separate from manual confirmation and recurring predictions. Real foreground banner and background OS-history presentation are proven for the simulator test reminder; native adapter tests cover due-date scheduling and session isolation. |
| Explainable, saved avalanche/snowball debt estimates | Shared deterministic debt tests cover zero APR, promo transitions, insufficient/non-amortizing payments and cents. Persisted debt tests verify current/statement/minimum/due fields, owner isolation, saved estimates and revision conflicts. Desktop and native preview/save/edit/reopen/payment-guidance interactions are recorded. No automatic payments/transfers. |
| Regression assurance and reviewable candidate | PR15 runs PostgreSQL, shared/client/API tests, mobile export, API/desktop/web builds and Windows packaging. Run96 exposed a too-small Windows icon;9f2175b fixes the source and adds a dimension check. Run97/34521260627 on code commit9f2175b passed all three jobs, including Windows packaging. This regression gate passes for that code revision. |
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

# Beta acceptance status — September 14, 2026

Source of requirements: [Worthlane brief](https://app.notion.com/p/3d57f32d407581d9a9eafcdb4d5ac152).
Candidate: [draft PR15](https://github.com/tymedina100/worthlane/pull/15).
The beta is **not complete**. This index separates evidence already recorded from
the final platform and persisted-journey audit still open. Detailed chronology and exact commands
are in [beta-progress.md](beta-progress.md).

| Required outcome | Evidence and remaining limit |
| --- | --- |
| Solo onboarding; invitation before partner registration; separate consenting logins; maximum two members | `apps/api/integration/household.test.ts` and `scripts/test-http.mjs` exercise registration, invitation token replacement/acceptance, access before consent, third-user rejection, fresh sessions and persistence. Latest fresh isolated PostgreSQL and HTTP run passed. Recorded desktop solo and native second-login journeys are in the progress log. A fresh Jamie solo registration through manual account, owned category, expense/refund, bill and debt plan now has September 11 fresh-login readbacks. The initial browser fill/grid-click attempts failed; subsequent real keyboard editing of the card day segment and the bill calendar succeeded, saved and persisted after reload. See jamie-keyboard-calendar-reloaded.txt. |
| Owned, equal and custom category responsibilities; 600/150/1700 fixtures; cents/refunds/history | The persisted household test creates the exact brief fixtures, verifies fresh-login allocations, privacy-filtered activity and versioned agreement history. Shared finance tests cover allocation extremes and rounding. Recorded desktop/native category and two-login reads supplement those tests. Responsibility is independent of the payer. |
| Plaid connect/reconnect/sync/recovery/unlink on supported beta clients | Real Sandbox backend persistence and full interactive desktop connect/sync/reconnect/forced-error recovery/unlink passed. Before unlink14 accounts/392transactions remained stable; unlink removed only Avery imported data, persisted after reload, and revoked provider access. Separate Morgan login excluded Avery personal bank accounts. Native app built and installed with verified personal app ID, development push and associated-domain entitlement; actual native OAuth returned from First Platypus, completed consent and saved the selected checking account plus149 imported transactions. Native ordinary sync and required OAuth repair after forced expiration also passed; saved Item/account/transaction IDs remained identical (2 total accounts/150 transactions, including the original manual fixture). Repeated Healthy-to-error transition also passed with immediate repair feedback and retained balance. Native Unlink removed the selected bank imports and revoked provider access; exact IDs of manual data and the other login’s banking data were preserved. Cold restart retained the unlink, original100 net worth and10 spending, and saved upcoming bills. A fresh App2App attempt completed Safari login/consent, returned to selected-account confirmation and saved a Healthy connection with one selected checking account and149 imports. The earlier stalled attempt remains recorded with unknown cause. Normal native cancellation was also verified after correcting the SDK empty-error handling. Final platform/journey coverage audit remains open. Local Maestro/XCTest access is working; phone work is excluded per Tyler's direction. |
| No double counting; truthful freshness and coverage | Persisted tests cover added/modified/removed/pending changes, transfers/card repayments, manual/import review, one-owner duplicates and bilateral account-match consent/revocation with viewer-specific privacy. Actual two-login match/revoke totals were recorded on desktop and native. Desktop and iOS Simulator ordinary banking lifecycles now have interactive evidence; Android standard Sandbox Link and repeat sync now pass; OAuth connection/import also passes; standard forced-error recovery and unlink also pass with exact retained-ID checks. |
| Reliable obligations; distinct card fields; manual fallback; estimated recurrence labels | Persisted HTTP checks cover bill edits, payment state, stale updates and partner isolation. Actual native bill recurrence/reminder save and debt-minimum conversion/reopen are recorded. Liabilities data is separate from manual confirmation and recurring predictions. Real foreground banner and background OS-history presentation were proven for the earlier simulator test reminder. Commit65c8b22 switches that diagnostic to DATE, matching obligation triggers; a fresh background banner was captured with this code. Native adapter tests cover the selected due date and local9am scheduling, recurrence replacement and session isolation. Physical-phone and actual9am delivery are not claimed. |
| Explainable, saved avalanche/snowball debt estimates | Shared deterministic debt tests cover zero APR, promo transitions, insufficient/non-amortizing payments and cents. Persisted debt tests verify current/statement/minimum/due fields, owner isolation, saved estimates and revision conflicts. Desktop and native preview/save/edit/reopen/payment-guidance interactions are recorded. Fresh September 11 browser sign-outs and separate logins preserved Morgan’s edited Snowball method and reopened Avery’s native-created Avalanche plan with distinct current100/statement90/minimum10/dueSeptember25 fields. Repeating minimum conversion returned the existing obligation; Avery retained exactly two upcoming items. Each login exposed only its own debt plan. No automatic payments/transfers. |
| Regression assurance and reviewable candidate | PR15 runs PostgreSQL, shared/client/API tests, mobile export, API/desktop/web builds and Windows packaging. Run96 exposed a too-small Windows icon;9f2175b fixes the source and adds a dimension check. Run98/34525382333 on code commit4637de3 passed all three jobs, including Windows packaging and the failed-bank-operation refresh regression. Run99/34635576604 on2eeb062 also passed all three jobs after native expired-session cleanup and protected-route changes, including nine auth/privacy checks. Run100/34638570386 on78b2ee8 also completed successfully after the explicit Apple-team configuration correction. Run101/34640584603 on45b97ea and run102/34641852325 on87d6156 subsequently passed all jobs, covering native bank-return routing and failed-operation refresh. Run103/34645896747 on f47e5ff passed all three jobs. Run104/34648733644 on65c8b22 also passed all three jobs after the DATE-trigger diagnostic change, including PostgreSQL integrations and regression builds. |
| Aesthetic app and full website; beta email list | Website redesign and persisted consent-based signup are live with scoped user approval; production browser signup/dedup/cleanup verified. Native forest/cream branding was built, installed and visually checked on the simulator. See `website-waitlist.md` and evidence images. Automated marketing emails are not part of the signup implementation. |

## Completion boundary

Do not convert this draft into a completed beta merely because CI passes. Finish
the supported-client Sandbox lifecycle, reconcile any remaining interactive gaps
against the brief, and review current evidence before marking the goal complete.
Physical-device installation is additional release evidence and is required before
claiming phone readiness; it is not a substitute for the brief's core journeys.
Likewise, do not add follow-on forecasting or gamification to extend this goal.

Existing production website approvals are fulfilled. Tyler subsequently authorized starting Plaid production setup and store
preparation, but explicitly prohibited submission. No paid services, live-data
migration, automatic merge/release or store submission is authorized. See
production-preparation.md for the current scope and remaining gates.

Android builds and runs in the laptop emulator. Jamie login and saved dashboard,
activity, bill and debt-field readbacks passed. Android package registration is
saved and fresh Sandbox link-token creation succeeds. Actual background test
reminder delivery is captured. CI107 on0ad4085 passed all jobs.

Standard Android First Platypus Sandbox Link completed interactively in b704555:
native Bank connected alert, HEALTHY Item, 14 accounts and394 distinct imported
transactions verified independently in PostgreSQL. Original manual account and
2 entries remain. Native repeat sync completed without duplicate imports.
Android OAuth returned to native selected-account confirmation and completed:
HEALTHY Item with one selected checking account and149 unique imported transactions.
Both connections and original manual data are preserved in PostgreSQL. See
android-oauth-success.png/xml; consent label targeting and fresh WebView inspection
resolved the earlier ambiguous selection/blank captures without an app code change.
Standard forced-error repair retained all16 account IDs/545 transaction IDs;
unlink revoked provider access and retained exactly OAuth/manual2 account IDs and
151 transaction IDs. Native screenshots and DB comparisons recorded September14.
The final native two-user coverage audit and current CI remain open.

Apple draft promotional text/description were saved and reloaded; review notes
remain stale after failed persistence. Store status remains Prepare for Submission
with manual release. Plaid team reports Production approval; exact products and
billing remain unverified. No submission or live banking has occurred.

# Worthlane couples-first beta product principles

Every visible V1 feature must serve at least one of these rules:

1. **Simple**
2. **Reduces stress**
3. **Shows what’s next**

Worthlane helps people build a life together without requiring them to merge all
their money. The September 8, 2026 [north star and acceptance criteria](https://app.notion.com/p/3d57f32d407581d9a9eafcdb4d5ac152)
supersede the earlier manual-only V1 scope and loss-aversion directives.

- Support solo users and households managed by up to two consenting adult logins.
  Solo setup never requires an invitation; family support does not add child logins.
- Make guided onboarding, categorized spending, editable owned/shared budgets,
  due dates/reminders, and explainable debt-payoff plans part of the beta.
- Support reliable Plaid banking with a complete manual fallback. Missing or stale
  banking data must be visible; predicted charges are not confirmed bill due dates.
- Keep budget responsibility, who paid, and account visibility separate. Accounts
  are private unless their owner explicitly grants access. Never expose private
  activity through household totals or infer consent from an invitation.
- Use calm, concrete language about responsibilities and remaining amounts.
  Do not introduce loss-aversion pressure, streak penalties, or partner surveillance.
- Keep money calculations deterministic in shared code with exact cent handling.
  Debt estimates disclose assumptions; no automatic payments or transfers.
- Preserve the mobile, desktop, shared API, and PostgreSQL architecture.

Completion requires persistent solo and two-user journeys, financial/privacy
tests, PostgreSQL integration tests, interactive UI evidence, and regression
builds. A demo or successful compilation is not beta acceptance. Use synthetic
data and Plaid Sandbox; spending, production changes, and public releases need
explicit approval. Track milestone evidence in [beta progress](docs/beta-progress.md).

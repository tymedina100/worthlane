# Worthlane

Worthlane V1 is a calm, manual-first personal-finance companion. It answers
three questions without requiring a bank connection: where do I stand today,
what is coming next, and what should I enter or handle now?

## What works in V1

- A Today snapshot: manually entered balance, this-month spending and income,
  next-seven-day obligations, and the next three items.
- Fast manual accounts and two-field expense/income entry.
- Manual bills, credit-card payments, subscriptions, and other obligations.
- Upcoming timeline grouped into overdue, today, this week, later, and recently
  paid; recurring items advance safely at month-end.
- Contextual local reminders (due date, one day before, or three days before).
- Settings for manual accounts, default reminders, notification permission,
  feature suggestions, support, and privacy.

V1 does not require Plaid, AI, RevenueCat, production push infrastructure, or
analytics. Those integrations remain isolated and disabled by default.

## Setup

Prerequisites: Node 20+, pnpm, and PostgreSQL 14+.

~~~bash
pnpm install
cp apps/api/.env.example apps/api/.env
# Set DATABASE_URL, JWT_SECRET, and JWT_REFRESH_SECRET.

pnpm db:migrate
pnpm db:generate

# apps/mobile/.env.local
EXPO_PUBLIC_API_URL=http://localhost:3001/api
~~~

Start the API and mobile app in separate terminals:

~~~bash
cd apps/api && pnpm dev
cd apps/mobile && pnpm dev
~~~

Use an iOS simulator, Android emulator, or an Expo development build.

## Environment variables

Required for V1:

| Location | Variable | Purpose |
|---|---|---|
| API | DATABASE_URL | PostgreSQL connection string |
| API | JWT_SECRET, JWT_REFRESH_SECRET | 32+ character JWT secrets |
| Mobile | EXPO_PUBLIC_API_URL | API URL, such as http://localhost:3001/api |

Optional integrations:

| Variable | Default | Notes |
|---|---|---|
| EXPO_PUBLIC_PLAID_ENABLED | false | Enables existing Plaid flows for later testing. |
| EXPO_PUBLIC_ENABLE_AI | false | Keeps the existing assistant outside V1. |
| EXPO_PUBLIC_ENABLE_PAYWALL | false | Keeps RevenueCat/paywalls outside V1. |
| EXPO_PUBLIC_REVENUECAT_IOS_KEY | unset | Used only when the paywall flag is enabled. |
| EXPO_PUBLIC_POSTHOG_KEY, POSTHOG_PROJECT_KEY | unset | Optional analytics; V1 does not capture financial details. |
| EXPO_PUBLIC_SENTRY_DSN, SENTRY_DSN | unset | Optional error reporting. |

Plaid server variables are optional and are not needed for V1.

## Notifications

Reminders are local Expo notifications. They are requested only when a person
enables reminders in Settings or saves an upcoming item using a reminder.
To test: add a future upcoming item, select a default timing in Settings, then
confirm the OS permission prompt. Editing, paying, deactivating, or deleting
an item cancels its previously scheduled local reminder.

## Quality checks

~~~bash
pnpm db:generate
pnpm --filter @worthlane/api typecheck
pnpm --filter @worthlane/mobile typecheck
pnpm --filter @worthlane/api test
~~~

## Roadmap

### V1

- Today dashboard
- Manual transactions
- Manual bills and card due dates
- Upcoming timeline
- Reminders
- Feature suggestions

### V1.1

- Plaid integration
- Bank and card syncing
- Imported transaction reconciliation
- Recurring-charge detection connected to real transactions

### V1.2

- AI insights
- Personalized recommendations
- Debt payoff guidance
- Spending-change suggestions
- Explainable, nonjudgmental financial coaching

## Known V1 limitations

Manual writes require an API connection; V1 retains cached query data for
readability but does not queue offline writes. The quick-add screen uses a
date-only field until a native date picker is introduced. Local notifications
depend on the OS and cannot be guaranteed after an app is uninstalled or
system-level notifications are disabled.

# UX & UI Testing Tasks

These tasks are designed for a UX/UI tester to evaluate key user flows and visual design in the Vantage mobile app.

---

## Task 1: Loss-Aversion Budget Messaging

**Goal:** Verify that budget progress messaging effectively motivates users without feeling punishing, and that all color states render correctly.

**Screens:** Budgets tab, Dashboard budget preview cards

**Steps:**
1. Create a budget for any category (e.g. Dining, $200/month).
2. Add transactions to move through each threshold:
   - >50% remaining → should show green card with calm, encouraging message
   - 20–50% remaining → should show amber card with urgency message (e.g. *"only $X stands between you and blowing this"*)
   - <20% remaining → should show red card with high-urgency message (e.g. *"every dollar here is a dollar stolen from your savings"*)
   - Over budget → should show over-limit state
3. Check the same budget card on the Dashboard for consistent color and messaging.
4. Review the monthly history chips (✓/✗) on each card — verify they're readable on small screen sizes.

**Pass Criteria:**
- [ ] All 3 color states (green/amber/red) render at the correct thresholds
- [ ] Messages are grammatically correct and match the intended tone at each level
- [ ] Progress bar color is always consistent with the card's state
- [ ] Spent vs. total amounts are accurate and clearly formatted
- [ ] Monthly history chips are legible on all tested device sizes

---

## Task 2: Onboarding & Authentication Flow

**Goal:** Confirm the full auth flow (register → login → biometric) works smoothly, handles errors gracefully, and presents a polished first impression.

**Screens:** Register, Login

**Steps:**
1. **Registration:**
   - Attempt to register with a password fewer than 8 characters — verify the validation error appears.
   - Attempt to register with mismatched "Confirm password" — verify the error message.
   - Complete a successful registration and confirm redirection to the main app.
2. **Login:**
   - Attempt login with incorrect credentials — verify a clear error message is shown.
   - Log in successfully with valid credentials.
3. **Biometric (if device supports it):**
   - Enable biometric login from the Profile screen.
   - Force-close the app and reopen — verify the biometric prompt appears automatically.
   - Authenticate with biometrics and confirm you land on the Dashboard.
4. **Remember Me:**
   - Log out, then log back in with "Remember me" checked.
   - Close and reopen the app — confirm the session is preserved.

**Pass Criteria:**
- [ ] All validation errors are shown inline, clearly describing the issue
- [ ] Successful registration lands user in the app (not back at login)
- [ ] Biometric prompt appears on app launch when enabled
- [ ] "Remember me" persists the session across app restarts
- [ ] Keyboard-aware layout prevents input fields from being obscured on all tested devices

---

## Task 3: Transaction Filtering & Detail Editing

**Goal:** Confirm that the transaction list is easy to navigate, filters work correctly, and editing a transaction (category, impulse flag, note) saves and reflects immediately.

**Screen:** Transactions tab

**Steps:**
1. Open the Transactions tab — verify the list loads with merchant name, date, category, and amount for each item.
2. **Search:** Type a merchant name in the search bar — verify results filter in real time. Clear the search and confirm the full list returns.
3. **Date range pills:** Tap "Last Month" then "All Time" — confirm the list updates for each selection.
4. **Category chips:** Tap a category chip (e.g. "Dining") — confirm only matching transactions appear. Tap another category to switch filters.
5. **Transaction detail:**
   - Tap any transaction to open the bottom sheet.
   - Change the category using the horizontal picker — verify the new selection is highlighted.
   - Add a note in the text field.
   - Toggle the Impulse switch on — verify the description text appears below it.
   - Tap Save — confirm the bottom sheet closes and the transaction now shows the ⚡ badge and updated category in the list.
6. **Impulse badge:** Confirm the ⚡ badge is visually distinct and doesn't overlap the amount or category label.
7. **Pagination:** If more than one page of transactions is available, tap "Load more" and confirm additional items append to the list (no duplicates, no layout shift).

**Pass Criteria:**
- [ ] Search and category filters produce accurate results
- [ ] Date range pills update the list correctly for all 3 options
- [ ] Edited transaction data (category, note, impulse flag) saves and reflects immediately in the list
- [ ] ⚡ impulse badge is legible and doesn't overlap other content
- [ ] Empty state (search returns no results) shows the 🔍 icon with a helpful message
- [ ] "Load more" appends items without duplicates or visible layout shift

---

## Task 4: Dashboard Information Hierarchy & Navigation

**Goal:** Evaluate whether the Dashboard communicates financial health at a glance, and that all interactive elements (nudge dismiss, "See all" links, pull-to-refresh) work correctly.

**Screen:** Dashboard tab

**Steps:**
1. **Loading state:** Navigate away and back to the Dashboard — verify skeleton loaders animate smoothly before data appears.
2. **Net worth card:** Confirm the net worth figure, month-over-month delta badge (up/down arrow + color), and sparkline chart all render correctly.
3. **Nudges:** If nudges are present (max 2 shown):
   - Read the nudge message — confirm it uses loss-aversion language and is grammatically correct.
   - Tap the dismiss button — verify the nudge disappears without a full page reload.
4. **Streaks:** Scroll the streak row horizontally — confirm all 3 streak types (Daily Checkin, Weekly On-Budget, No Impulse) are visible and show a count. If a streak is "at risk," confirm the warning is visually distinct.
5. **Budget overview:** Confirm the top 3 budgets show color-coded progress bars and loss-aversion messages consistent with the Budgets tab.
6. **"See all" links:** Tap each "See all" link (Budgets, Goals, Transactions) — verify they navigate to the correct tab.
7. **Pull-to-refresh:** Pull down on the scroll view — confirm a refresh indicator appears and data reloads.
8. **Impulse spending card:** Confirm the impulse purchase count and trend vs. previous week are displayed. If impulse count is 0, verify a neutral or positive message is shown.

**Pass Criteria:**
- [ ] Skeleton loaders display during data fetch and transition smoothly to real content
- [ ] Net worth delta badge uses correct color (green for positive, red for negative)
- [ ] Dismissing a nudge removes it immediately without reloading the page
- [ ] Streak "at risk" state is visually distinct from a healthy streak
- [ ] All "See all" navigation links route to the correct tab
- [ ] Pull-to-refresh works and updates stale data
- [ ] Impulse spending card is present and accurately reflects transaction data

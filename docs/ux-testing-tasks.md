# UX & UI Testing Tasks

These tasks are designed to gather detailed feedback on the Vantage app's UX and visual design. For each step, write down your honest first impressions, any moments of confusion, and anything that delighted or frustrated you. There are no wrong answers — your feedback is the goal.

---

## Task 1: First Impressions — Sign Up & Login

**Context:** You're a new user downloading a personal finance app for the first time. You've never seen this app before.

**What we want to know:** Does the onboarding feel welcoming and trustworthy? Is it obvious what to do at each step? Does anything feel broken, confusing, or off-brand?

---

### Step 1 — Open the app for the first time

- You land on the Login screen. Before doing anything, take 5–10 seconds to look at it.
- **Write down:** What is your first impression? Does it feel like a premium app? What's the first thing your eye goes to? Does the dark color scheme feel appropriate for a finance app?

---

### Step 2 — Try to register with bad inputs (intentionally)

- Tap "Create an account" (or the register link).
- Type a password that is only 5 characters long and try to submit.
  - **Write down:** Where does the error appear? Is it immediately obvious what went wrong and what you need to do to fix it?
- Now type a password in the first field and a *different* password in the "Confirm password" field, then try to submit.
  - **Write down:** Does the error message make it clear which field is wrong? Is the wording clear?
- Tap into the email field, then tap into the password field. Does the keyboard cover any input fields?
  - **Write down:** Can you see what you're typing at all times, or does the keyboard push content off screen?

---

### Step 3 — Complete registration successfully

- Fill in a valid email and a password of 8+ characters and submit.
- **Write down:** Is there any loading indicator while the request is in flight? After success, where do you land? Does it feel like a smooth transition into the app, or is it abrupt?

---

### Step 4 — Log out and log back in

- Go to the Profile tab and tap "Sign Out." Confirm the alert prompt.
  - **Write down:** Does the sign-out confirmation feel necessary, or is it annoying? Is the button labeled clearly?
- Log back in with your credentials.
  - **Write down:** Does anything feel different the second time you log in vs. the first? Is the login experience fast?

---

### Step 5 — Biometric login (skip if your device doesn't support it)

- From Profile, find the Face ID / Touch ID / Fingerprint toggle and enable it.
- Force-close the app and reopen it.
  - **Write down:** Does the biometric prompt appear automatically or do you have to tap something first? Does it feel seamless, or does it interrupt the app opening experience?
- Authenticate with biometrics.
  - **Write down:** Is the transition into the app instant? Or is there a delay?

---

**Overall feedback for Task 1:**
- On a scale of 1–5, how smooth did the auth flow feel? (1 = very frustrating, 5 = completely seamless)
- Was there any moment where you weren't sure what to do next?
- Is there anything about the visual design on these screens you'd change?

---

## Task 2: Dashboard — Understanding Your Financial Picture

**Context:** You've just logged in. The Dashboard is the first thing you see every time you open the app.

**What we want to know:** Within 30 seconds, can a user understand their financial health? Is the information hierarchy clear? Does the page feel overwhelming or just right?

---

### Step 1 — First look at the Dashboard (30 seconds, no scrolling)

- When you land on the Dashboard, stop and look at only what's visible without scrolling.
- **Write down:** What information did you notice first? What did you notice second? What is the single most important thing this screen is trying to tell you? Is that the right thing to lead with?

---

### Step 2 — Net worth card

- Look at the large card at the top (your net worth, sparkline chart, and income/spending row).
- **Write down:** Is the net worth number easy to find? Do you understand what the up/down badge next to it means? Does the sparkline chart add useful information or just visual noise? Is the "Income vs. Spending" breakdown below it clear at a glance?

---

### Step 3 — Nudges (AI-generated messages)

- Look at the nudge cards (if present — they appear below the accounts section).
- Read the message on one of the nudge cards out loud.
  - **Write down:** Does the message feel personal and relevant, or does it feel generic? Is the tone motivating or anxiety-inducing? Is the language clear and natural?
- Tap the dismiss button on a nudge.
  - **Write down:** Did it disappear immediately? Did the cards below it animate up smoothly, or was there a jarring jump?

---

### Step 4 — Streaks row

- Find the horizontal streak row (Daily Checkin, Weekly On-Budget, No Impulse).
- **Write down:** Do you immediately understand what each streak represents? Is the streak count displayed prominently enough? If a streak shows "at risk," does that warning stand out visually? Does swiping the row horizontally feel natural, or did you not know it was scrollable?

---

### Step 5 — Scroll the full Dashboard

- Scroll all the way to the bottom without tapping anything.
- **Write down:** How long does the page feel? Does it feel like too much information on one screen, or about right? Which sections feel most useful? Which feel least useful or could be removed?

---

### Step 6 — Tap each "See all" link

- Tap the "See all" link next to Budgets, Goals, and the Transactions section.
- **Write down:** Do you land on the right screen each time? Is the navigation instant, or is there a noticeable delay?

---

### Step 7 — Pull to refresh

- Pull down from the top of the Dashboard scroll view.
- **Write down:** Does the refresh indicator appear and feel native to the platform? Does the data visibly update after the refresh completes?

---

**Overall feedback for Task 2:**
- On a scale of 1–5, how clearly does the Dashboard communicate your financial health? (1 = very confusing, 5 = crystal clear)
- What's the one thing on the Dashboard you would remove to reduce clutter?
- What's the one thing missing that you'd want to see here?

---

## Task 3: Budgets — Setting Limits & Reacting to Warnings

**Context:** You want to track your spending in a few categories this month and get warnings before you overspend.

**What we want to know:** Is the budget creation flow intuitive? Do the warning messages feel helpful or alarming? Does the visual design make it easy to spot which budgets need attention?

---

### Step 1 — Create your first budget

- Tap the Budgets tab. Look at the empty state screen.
  - **Write down:** Does the empty state make it obvious what to do? Is the call-to-action button easy to find?
- Tap "+ New" and create a budget:
  - Pick a category (e.g. Dining or Shopping) from the scrollable chip row.
  - Set a monthly amount (e.g. $200).
  - Tap Save.
  - **Write down:** Was the category picker easy to use? Did you have to scroll to find the category you wanted? Was the amount input obvious (no confusion about currency format, decimal, etc.)? Did anything feel unnecessarily complicated?

---

### Step 2 — Read the budget card at a healthy level (>50% remaining)

- After creating the budget with no spending, look at the card.
- **Write down:** Can you immediately tell how much you have left? What does the progress bar and color communicate to you? Read the small message below the progress bar — does it feel encouraging, neutral, or confusing? Does the card feel visually clean or cluttered?

---

### Step 3 — Simulate a warning state (20–50% remaining)

- Add transactions (or ask the test coordinator to adjust spending) so the budget is between 20–50% remaining (amber state).
- **Write down:** Does the color change feel noticeable compared to the green state? Read the loss-aversion message (e.g. *"only $X stands between you and blowing this"*) — does this phrasing feel motivating, annoying, or dramatic? Does the urgency feel appropriate at this level?

---

### Step 4 — Simulate a critical state (<20% remaining)

- Adjust spending so less than 20% of the budget remains (red state).
- **Write down:** Does the red state feel alarming or just informational? Read the message at this level (e.g. *"every dollar here is a dollar stolen from your savings"*) — does this feel too aggressive, just right, or not strong enough? Would this message make you change your behavior?

---

### Step 5 — Review the monthly history chips

- Look at the row of ✓ and ✗ chips at the bottom of a budget card (showing whether you stayed on budget in past months).
- **Write down:** Did you notice these chips without being told to look for them? Is the pattern easy to read at a glance? Do you understand what they represent without any label?

---

### Step 6 — Edit and delete a budget

- Tap the edit icon (pencil emoji) on a budget card. Change the amount and save.
  - **Write down:** Did the card update immediately? Was the edit flow as simple as the create flow?
- Tap the delete icon (trash emoji) on a budget card. Confirm the deletion.
  - **Write down:** Was there a confirmation prompt? Did it feel appropriately cautious without being annoying?

---

**Overall feedback for Task 3:**
- On a scale of 1–5, how motivating did the budget messaging feel overall? (1 = not motivating at all, 5 = I want to stay on budget)
- Did any of the loss-aversion messages feel too harsh or off-putting?
- Is there anything missing from the budget card that would make it more useful to you?

---

## Task 4: Transactions — Finding & Understanding Your Spending

**Context:** You want to review your recent spending, find a specific purchase, and correct a transaction that was categorized wrong.

**What we want to know:** Is the transaction list easy to scan? Are the filters intuitive? Does editing a transaction feel quick and painless?

---

### Step 1 — First look at the Transactions tab

- Open the Transactions tab without using any filters.
- **Write down:** Is it immediately clear what each row represents? Can you tell the difference between income (green amounts) and expenses (red amounts) at a glance? Is the merchant name, date, and category readable without squinting? Does the layout feel dense or comfortable?

---

### Step 2 — Use the search bar

- Tap the search bar and type the name of a merchant you know exists (e.g. "Starbucks" or "Amazon").
  - **Write down:** Do results filter as you type, or only after submitting? How fast does the list update? Is it obvious the list is filtered (i.e., does it clearly show you're in "search mode")?
- Clear the search.
  - **Write down:** Does the full list come back immediately?

---

### Step 3 — Use the date range pills

- Tap "Last Month."
  - **Write down:** Does the list update instantly? Is it obvious which pill is currently active?
- Tap "All Time."
  - **Write down:** Same questions — does it feel responsive?

---

### Step 4 — Use the category filter chips

- Tap one of the colored category chips (e.g. "Dining").
  - **Write down:** Does the list immediately filter? Is the active chip visually distinct from the unselected ones? Was it obvious the row of chips was scrollable before you tried?
- Tap a different category chip to switch filters.
  - **Write down:** Does the previous filter clear automatically, or do chips stack? Is the behavior intuitive?

---

### Step 5 — Open and edit a transaction

- Tap on any transaction row to open the detail bottom sheet.
  - **Write down:** Does the bottom sheet animate up smoothly? Is it immediately obvious what you can do in this view?
- Change the category using the horizontal category picker.
  - **Write down:** Is the currently selected category visually obvious? Is the picker easy to scroll and tap?
- Type a short note in the note field (e.g. "business lunch").
  - **Write down:** Does the keyboard appear and position the text field in view, or does the keyboard cover the input?
- Toggle the "Impulse" switch on.
  - **Write down:** Is it obvious what "Impulse" means in this context? Does a description appear to explain it? Does the toggle feel satisfying to interact with?
- Tap Save.
  - **Write down:** Does the bottom sheet close smoothly? Is the ⚡ badge now visible on that transaction in the list? Did the category label update immediately?

---

### Step 6 — Overall list scan

- Scroll through the transaction list without filters applied.
- **Write down:** Is there any information you'd want to see on each row that isn't there? Is there anything on each row that feels unnecessary? Does the ⚡ impulse badge stand out clearly next to impulse purchases?

---

**Overall feedback for Task 4:**
- On a scale of 1–5, how easy was it to find a specific transaction? (1 = very hard, 5 = very easy)
- Did the category filter chips feel like a natural way to filter, or would you prefer a different pattern (e.g. a dropdown)?
- Was there anything about the transaction editing experience that felt slow or clunky?

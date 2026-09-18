import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseEnv } from 'node:util';

// Explicitly authorized, isolated Railway environment. Never accept an arbitrary
// host or reuse production credentials. Saved logins contain synthetic data only.
const origin = 'https://worthlane-beta-sandbox.up.railway.app';
const phase = process.argv[2];
assert(['--create', '--couple', '--verify', '--verify-manual-ui', '--debt'].includes(phase), 'Use --create, --couple, --verify --verify-manual-ui or --debt');
assert.equal(process.env.WORTHLANE_HOSTED_SANDBOX_APPROVED, 'true');
const path = resolve('.tmp/hosted-sandbox-fixture.json');
mkdirSync(resolve('.tmp'), { recursive: true });
let fixture = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
const save = () => writeFileSync(path, JSON.stringify(fixture), { mode: 0o600 });
async function request(route, body, token, status = 200) {
  const response = await fetch(`${origin}/api${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(120_000),
  });
  assert.equal(response.status, status, `${route}: unexpected HTTP status`);
  return status >= 400 ? null : (await response.json()).data;
}
// This deliberately bounded fixture must fit in one complete response. Fail
// rather than silently comparing only a default first page of financial data.
async function ledgerSnapshot(token) {
  const data = await request('/transactions?limit=1000', undefined, token);
  assert(data.total <= 1000, 'Fixture exceeded complete-ledger verification bound');
  assert.equal(data.transactions.length, data.total, 'Incomplete transaction readback');
  assert.equal(new Set(data.transactions.map(t => t.id)).size, data.total, 'Duplicate transaction IDs');
  return data.transactions.sort((a, b) => a.id.localeCompare(b.id));
}
try {
  assert.equal((await request('/health')).status, 'ready');
  await request('/accounts', undefined, undefined, 401);
  if (phase === '--create') {
    if (!fixture) {
      fixture = { origin, email: `hosted-${randomUUID()}@worthlane.test`, password: `Synthetic-${randomUUID()}!` };
      save();
    }
    assert.equal(fixture.origin, origin);
    if (!fixture.userId) {
      const auth = await request('/auth/register', { email: fixture.email, password: fixture.password }, undefined, 201);
      fixture.userId = auth.user.id; save();
    }
    const auth = await request('/auth/login', { email: fixture.email, password: fixture.password });
    const token = auth.accessToken;
    const categories = await request('/categories', undefined, token);
    assert(categories.length >= 16, 'Fresh database must include system categories');
    if (!fixture.manualId) {
      fixture.manualId = (await request('/accounts', { name: 'Hosted synthetic checking', type: 'CHECKING', currentBalance: 100 }, token, 201)).id;
      save();
    }
    if (!fixture.transactionId) {
      fixture.transactionId = (await request('/transactions', { accountId: fixture.manualId, categoryId: categories.find(c => c.name === 'Food & Drink').id, amount: 23.47, date: new Date().toISOString(), merchantName: 'Hosted synthetic purchase', spendingTreatment: 'AUTO' }, token, 201)).id;
      save();
    }
    if (!fixture.itemId) {
      // Recover a completed exchange if the process stopped before checkpointing.
      const savedItems = (await request('/accounts', undefined, token)).plaidItems;
      assert(savedItems.length <= 1, 'Unexpected extra Sandbox Item; inspect before continuing');
      if (savedItems.length === 1) {
        assert.equal(savedItems[0].institution, 'Hosted Sandbox fixture');
        fixture.itemId = savedItems[0].id; save();
      }
    }
    if (!fixture.itemId) {
      const env = parseEnv(readFileSync(resolve('apps/api/.env.local'), 'utf8'));
      assert.equal(env.PLAID_ENV, 'sandbox');
      const require = createRequire(resolve('apps/api/package.json'));
      const { PlaidApi, Configuration, PlaidEnvironments, Products } = require('plaid');
      const plaid = new PlaidApi(new Configuration({ basePath: PlaidEnvironments.sandbox, baseOptions: { timeout: 20000, headers: { 'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID, 'PLAID-SECRET': env.PLAID_SECRET } } }));
      const created = await plaid.sandboxPublicTokenCreate({ institution_id: 'ins_109508', initial_products: [Products.Transactions, Products.Liabilities] });
      const linked = await request('/plaid/exchange', { publicToken: created.data.public_token, institutionName: 'Hosted Sandbox fixture' }, token, 201);
      fixture.itemId = linked.plaidItem.id; save();
    }
    fixture.accountIds = (await request('/accounts', undefined, token)).accounts.map(a => a.id).sort();
    assert(fixture.accountIds.length > 1);
    fixture.complete = true; save();
    console.log(`PASS: isolated hosted registration, seeded categories, manual spending and real Plaid Sandbox exchange; ${fixture.accountIds.length} accounts saved. Run --verify separately.`);
  } else if (phase === '--couple') {
    assert(fixture?.complete && fixture.origin === origin, 'Complete hosted solo fixture required');
    const { accessToken: token } = await request('/auth/login', { email: fixture.email, password: fixture.password });
    if (!fixture.householdId) {
      const household = await request('/households', { name: 'Hosted synthetic household', displayName: 'Morgan', timezone: 'America/Phoenix', currency: 'USD' }, token, 201);
      fixture.householdId = household.householdId; fixture.ownerMemberId = household.memberId; save();
    }
    if (!fixture.partner) {
      fixture.partner = { email: `hosted-partner-${randomUUID()}@worthlane.test`, password: `Synthetic-${randomUUID()}!` }; save();
    }
    if (!fixture.invitationCode) {
      const invite = await request('/households/current/partners/link', { email: fixture.partner.email, displayName: 'Avery' }, token, 202);
      fixture.invitationCode = invite.invitationCode; save();
    }
    if (!fixture.partner.userId) {
      const registered = await request('/auth/register', { email: fixture.partner.email, password: fixture.partner.password }, undefined, 201);
      fixture.partner.userId = registered.user.id; save();
    }
    const partner = await request('/auth/login', { email: fixture.partner.email, password: fixture.partner.password });
    if (!fixture.partner.memberId) {
      await request('/households/current/summary', undefined, partner.accessToken, 404);
      await request('/households/invitations/accept', { invitationCode: fixture.invitationCode }, partner.accessToken);
      fixture.partner.memberId = (await request('/households/current/summary', undefined, partner.accessToken)).viewerMemberId; save();
    }
    const existing = (await request('/households/current/summary', undefined, token)).responsibilities;
    for (const row of [
      { name: 'Groceries', monthlyAmountMinor: 60000, assignment: { mode: 'EQUAL', memberIds: [fixture.ownerMemberId, fixture.partner.memberId] } },
      { name: 'Utilities', monthlyAmountMinor: 15000, assignment: { mode: 'ASSIGNED', memberId: fixture.partner.memberId } },
      { name: 'Rent', monthlyAmountMinor: 170000, assignment: { mode: 'PERCENTAGE', shares: [{ memberId: fixture.ownerMemberId, basisPoints: 6000 }, { memberId: fixture.partner.memberId, basisPoints: 4000 }] } },
    ]) if (!existing.some(r => r.name === row.name)) await request('/households/current/responsibilities', row, token, 201);
    fixture.coupleComplete = true; save();
    console.log('PASS: invite created before separate partner registration; household unavailable until code acceptance; equal, assigned and 60/40 responsibilities persisted.');
  } else {
    assert(fixture?.complete && fixture.origin === origin, 'Complete hosted fixture required');
    const { accessToken } = await request('/auth/login', { email: fixture.email, password: fixture.password });
    assert.deepEqual((await request('/accounts', undefined, accessToken)).accounts.map(a => a.id).sort(), fixture.accountIds);
    const transaction = (await ledgerSnapshot(accessToken)).find(t => t.id === fixture.transactionId);
    assert.equal(transaction?.amount, 23.47);
    const result = await request('/plaid/sync', { plaidItemId: fixture.itemId, refresh: false }, accessToken);
    for (const key of ['added', 'modified', 'removed']) assert(Number.isInteger(result[key]) && result[key] >= 0);
    assert.deepEqual((await request('/accounts', undefined, accessToken)).accounts.map(a => a.id).sort(), fixture.accountIds);
    console.log('PASS: separate-process fresh login recovered exact saved accounts and manual amount; real Sandbox sync decrypted persisted token without duplicate accounts.');
    const settledLedger = await ledgerSnapshot(accessToken);
    assert(settledLedger.some(t => !t.isManual), 'Imported Sandbox spending must be present');
    assert.equal(settledLedger.filter(t => t.id === fixture.transactionId).length, 1);
    const repeatSync = await request('/plaid/sync', { plaidItemId: fixture.itemId, refresh: false }, accessToken);
    for (const key of ['added', 'modified', 'removed']) assert.equal(repeatSync[key], 0, `Unexpected repeat Sandbox ${key}`);
    assert.deepEqual(await ledgerSnapshot(accessToken), settledLedger, 'Repeat sync changed saved ledger IDs or financial fields');
    console.log(`PASS: complete ${settledLedger.length}-transaction ledger retained exact IDs and financial fields after repeat Sandbox sync; no sampled first-page comparison.`);
    if (phase === '--debt' || fixture.debtPlanId) {
      const input = { name: 'Hosted zero-interest payoff', startMonth: '2027-01', strategy: 'AVALANCHE', monthlyPaymentMinor: 10000,
        debts: [{ id: 'hosted-card', name: 'Hosted synthetic card', balanceMinor: 30000, minimumPaymentMinor: 2500, aprBasisPoints: 0, statementBalanceMinor: 30000, dueDate: '2027-01-31' }] };
      if (!fixture.debtPlanId) {
        const existing = (await request('/debt-plans', undefined, accessToken)).filter(p => p.input.name === input.name);
        assert(existing.length <= 1, 'Unexpected duplicate fixture plan');
        const saved = existing[0] ?? await request('/debt-plans', input, accessToken, 201);
        fixture.debtPlanId = saved.id; save();
      }
      const plan = await request(`/debt-plans/${fixture.debtPlanId}`, undefined, accessToken);
      assert.deepEqual(plan.input, input);
      assert.equal(plan.estimate.status, 'PAID_OFF');
      assert.equal(plan.estimate.totalInterestMinor, 0);
      assert.equal(plan.estimate.totalPaidMinor, 30000);
      assert.deepEqual(plan.estimate.schedule.map(m => m.remainingMinor), [20000, 10000, 0]);
      assert.equal(plan.estimate.payoffMonth, '2027-03');
      assert(Array.isArray(plan.assumptions) && plan.assumptions.length > 0, 'Explainable assumptions required');
      const beforeTransactions = (await ledgerSnapshot(accessToken)).map(t => t.id);
      const duePath = `/debt-plans/${fixture.debtPlanId}/upcoming`;
      const dueBody = { entryId: 'hosted-card', revision: plan.revision };
      const firstDue = await request(duePath, dueBody, accessToken);
      const repeatDue = await request(duePath, dueBody, accessToken);
      assert.equal(firstDue.id, repeatDue.id);
      assert.equal(repeatDue.alreadyExists, true);
      const matches = (await request('/upcoming', undefined, accessToken)).items.filter(i => i.id === firstDue.id);
      assert.equal(matches.length, 1);
      assert.equal(matches[0].dueDate, '2027-01-31');
      assert.equal(matches[0].amount, 25);
      assert.equal(matches[0].reminderTiming, 'NONE');
      assert.equal(matches[0].isPaid, false);
      assert.deepEqual((await ledgerSnapshot(accessToken)).map(t => t.id), beforeTransactions);
      fixture.debtDueId = firstDue.id; save();
      console.log('PASS: persisted zero-APR plan explains three $100 payments; repeated due-date handoff keeps one unpaid $25 January31 item, reminders off, with no synthetic payment transaction.');
    }
    if (fixture.coupleComplete) {
      const partner = await request('/auth/login', { email: fixture.partner.email, password: fixture.partner.password });
      if (fixture.debtPlanId) {
        await request(`/debt-plans/${fixture.debtPlanId}`, undefined, partner.accessToken, 404);
        await request(`/debt-plans/${fixture.debtPlanId}/upcoming`, { entryId: 'hosted-card', revision: 1 }, partner.accessToken, 404);
        assert(!(await request('/upcoming', undefined, partner.accessToken)).items.some(i => i.id === fixture.debtDueId));
      }
      const first = await request('/households/current/summary', undefined, accessToken);
      const second = await request('/households/current/summary', undefined, partner.accessToken);
      assert.equal(first.household.id, fixture.householdId);
      assert.equal(second.household.id, fixture.householdId);
      assert.equal(second.members.length, 2);
      assert.deepEqual(first.responsibilities, second.responsibilities);
      const amounts = name => first.responsibilities.find(r => r.name === name).allocations.map(a => a.assignedMinor).sort((a,b) => a-b);
      assert.deepEqual(amounts('Groceries'), [30000, 30000]);
      assert.deepEqual(amounts('Utilities'), [15000]);
      assert.deepEqual(amounts('Rent'), [68000, 102000]);
      assert.equal(first.responsibilities.reduce((n,r) => n + r.monthlyAmountMinor, 0), 245000);
      const partnerAccounts = await request('/accounts', undefined, partner.accessToken);
      if (phase === '--verify-manual-ui') {
        assert.equal(partnerAccounts.accounts.length, 1, 'Exactly one UI-created fallback account expected');
        const account = partnerAccounts.accounts[0];
        assert.equal(account.name, 'Avery manual fallback');
        assert.equal(Number(account.currentBalance), 125.50);
        assert.equal(account.plaidItemId, null);
        assert.equal(partnerAccounts.plaidItems.length, 0, 'Unopened Link must not create an Item');
        fixture.partner.manualId = account.id; save();
      }
      assert.deepEqual(partnerAccounts.accounts.map(a => a.id), fixture.partner.manualId ? [fixture.partner.manualId] : []);
      if (fixture.partner.manualId) {
        assert.equal(Number(partnerAccounts.accounts[0].currentBalance), 125.50);
        assert(!fixture.accountIds.includes(fixture.partner.manualId));
        assert.equal(partnerAccounts.plaidItems.length, 0);
        console.log('PASS: UI-created partner manual fallback persisted at $125.50; owner account list excludes it; failed Link saved no Item.');
      }
      assert.equal((await request('/transactions', undefined, partner.accessToken)).transactions.length, 0);
      console.log('PASS: both fresh logins recover matching saved responsibilities, exact $2,450 total and partner isolation from owner bank accounts/transactions.');
    }
  }
} catch (error) {
  // Never serialize provider request config, response payloads or auth tokens.
  console.error(error?.isAxiosError ? 'Sandbox provider request failed; sensitive details omitted.' : error.message);
  process.exitCode = 1;
}

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
assert(['--create', '--couple', '--verify'].includes(phase), 'Use --create, --couple or --verify');
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
    const transaction = (await request('/transactions', undefined, accessToken)).transactions.find(t => t.id === fixture.transactionId);
    assert.equal(transaction?.amount, 23.47);
    const result = await request('/plaid/sync', { plaidItemId: fixture.itemId, refresh: false }, accessToken);
    for (const key of ['added', 'modified', 'removed']) assert(Number.isInteger(result[key]) && result[key] >= 0);
    assert.deepEqual((await request('/accounts', undefined, accessToken)).accounts.map(a => a.id).sort(), fixture.accountIds);
    console.log('PASS: separate-process fresh login recovered exact saved accounts and manual amount; real Sandbox sync decrypted persisted token without duplicate accounts.');
    if (fixture.coupleComplete) {
      const partner = await request('/auth/login', { email: fixture.partner.email, password: fixture.partner.password });
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
      assert.equal((await request('/accounts', undefined, partner.accessToken)).accounts.length, 0);
      assert.equal((await request('/transactions', undefined, partner.accessToken)).transactions.length, 0);
      console.log('PASS: both fresh logins recover matching saved responsibilities, exact $2,450 total and partner isolation from owner bank accounts/transactions.');
    }
  }
} catch (error) {
  // Never serialize provider request config, response payloads or auth tokens.
  console.error(error?.isAxiosError ? 'Sandbox provider request failed; sensitive details omitted.' : error.message);
  process.exitCode = 1;
}

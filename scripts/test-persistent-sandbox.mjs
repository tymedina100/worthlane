import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Run --create, restart dev-sandbox.mjs, then --verify. Only local Sandbox.
const phase = process.argv[2];
assert(['--create', '--verify'].includes(phase), 'Use --create or --verify with the persistent local Sandbox server.');
const require = createRequire(resolve('apps/api/package.json'));
createRequire(require.resolve('next/package.json'))('@next/env').loadEnvConfig(resolve('apps/api'));
assert.equal(process.env.PLAID_ENV, 'sandbox');
const fixturePath = resolve('.tmp/persistent-sandbox-fixture.json');
async function request(path, body, token) {
  const response = await fetch(`http://127.0.0.1:3301/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(120_000),
  });
  assert(response.ok, `${path}: HTTP ${response.status}`);
  return (await response.json()).data;
}
try {
  if (phase === '--create') {
    assert(!existsSync(fixturePath), 'Fixture already exists; use --verify rather than creating another.');
    const fixture = { email: `persistent-${randomUUID()}@worthlane.local`, password: `Synthetic-${randomUUID()}!` };
    const auth = await request('/auth/register', fixture);
    const { PlaidApi, Configuration, PlaidEnvironments, Products } = require('plaid');
    const plaid = new PlaidApi(new Configuration({ basePath: PlaidEnvironments.sandbox, baseOptions: {
      timeout: 20_000, headers: { 'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID, 'PLAID-SECRET': process.env.PLAID_SECRET },
    } }));
    const created = await plaid.sandboxPublicTokenCreate({ institution_id: 'ins_109508', initial_products: [Products.Transactions, Products.Liabilities] });
    const exchanged = await request('/plaid/exchange', { publicToken: created.data.public_token, institutionName: 'Persistent Sandbox fixture' }, auth.accessToken);
    const accounts = await request('/accounts', undefined, auth.accessToken);
    assert(accounts.accounts.length > 0);
    writeFileSync(fixturePath, JSON.stringify({ ...fixture, itemId: exchanged.plaidItem.id, accountIds: accounts.accounts.map(a => a.id).sort() }), { mode: 0o600, flag: 'wx' });
    console.log(`PASS: registered synthetic login and saved ${accounts.accounts.length} bank accounts. Restart the persistent server, then run --verify.`);
  } else {
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
    const auth = await request('/auth/login', { email: fixture.email, password: fixture.password });
    const accounts = await request('/accounts', undefined, auth.accessToken);
    assert.deepEqual(accounts.accounts.map(a => a.id).sort(), fixture.accountIds);
    const sync = await request('/plaid/sync', { plaidItemId: fixture.itemId, refresh: false }, auth.accessToken);
    for (const field of ['added', 'modified', 'removed']) assert(Number.isInteger(sync[field]) && sync[field] >= 0);
    const after = await request('/accounts', undefined, auth.accessToken);
    assert.deepEqual(after.accounts.map(a => a.id).sort(), fixture.accountIds);
    console.log('PASS: fresh login reopened the same bank accounts; encrypted token survived restart and real Sandbox sync succeeded without duplicating accounts.');
  }
} catch (error) {
  // Provider exceptions may contain credentials and tokens in request config.
  console.error(error?.isAxiosError ? 'Sandbox provider request failed; sensitive details omitted.' : error.message);
  process.exitCode = 1;
}

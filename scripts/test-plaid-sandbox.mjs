import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

// Explicit external Sandbox run. Never reads or writes an application database.
if (!process.argv.includes('--live-sandbox')) throw new Error('Pass --live-sandbox to call Plaid Sandbox.');
const apiRequire = createRequire(resolve('apps/api/package.json'));
createRequire(apiRequire.resolve('next/package.json'))('@next/env').loadEnvConfig(resolve('apps/api'));
if (process.env.PLAID_ENV !== 'sandbox') throw new Error('PLAID_ENV must explicitly be sandbox.');
if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) throw new Error('Sandbox credentials are required.');
const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = apiRequire('plaid');
const client = new PlaidApi(new Configuration({ basePath: PlaidEnvironments.sandbox,
  baseOptions: { timeout: 20_000, headers: { 'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID, 'PLAID-SECRET': process.env.PLAID_SECRET } } }));
let accessToken;
function safeCode(error) {
  const code = error?.response?.data?.error_code;
  return typeof code === 'string' && /^[A-Z_]+$/.test(code) ? code : 'REQUEST_FAILED';
}
try {
  const linkRequest = { user: { client_user_id: `worthlane-smoke-${randomUUID()}` }, client_name: 'Worthlane Sandbox smoke', country_codes: [CountryCode.Us], language: 'en' };
  const link = await client.linkTokenCreate({ ...linkRequest, products: [Products.Transactions] });
  assert(link.data.link_token);
  console.log('PASS: Sandbox create Link token.');
  const created = await client.sandboxPublicTokenCreate({ institution_id: 'ins_109508', initial_products: [Products.Transactions] });
  const exchange = await client.itemPublicTokenExchange({ public_token: created.data.public_token });
  accessToken = exchange.data.access_token;
  const accounts = await client.accountsGet({ access_token: accessToken });
  assert(accounts.data.accounts.length > 0);
  const sync = await client.transactionsSync({ access_token: accessToken });
  assert.equal(typeof sync.data.has_more, 'boolean');
  console.log(`PASS: Sandbox exchange, ${accounts.data.accounts.length} accounts, initial sync response (history may still be loading).`);
  await client.sandboxItemResetLogin({ access_token: accessToken });
  const item = await client.itemGet({ access_token: accessToken });
  assert.equal(item.data.item.error?.error_code, 'ITEM_LOGIN_REQUIRED');
  const update = await client.linkTokenCreate({ ...linkRequest, access_token: accessToken });
  assert(update.data.link_token);
  console.log('PASS: Sandbox login-required error and update-mode Link token. Interactive recovery is still required.');
} catch (error) {
  console.error(`Sandbox smoke failed: ${safeCode(error)}. No credentials or response bodies logged.`);
  process.exitCode = 1;
} finally {
  if (accessToken) {
    try { await client.itemRemove({ access_token: accessToken }); console.log('PASS: removed task-created Sandbox Item.'); }
    catch (error) { console.error(`Sandbox cleanup failed: ${safeCode(error)}.`); process.exitCode = 1; }
  }
}

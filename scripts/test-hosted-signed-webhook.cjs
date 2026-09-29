// Run via SSH inside the isolated beta-sandbox API service. No real users or Items.
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
async function main() {
  assert.equal(process.env.RAILWAY_PROJECT_ID, 'a2386fda-ce79-4de5-b8c5-aef7ec8e8e3e');
  assert.equal(process.env.RAILWAY_ENVIRONMENT_ID, 'dbeb62fc-92fb-4bb1-b630-eafa600c897b');
  assert.equal(process.env.RAILWAY_SERVICE_ID, '59dc5245-3e9e-4d69-8450-72c4c834aff1');
  assert.equal(process.env.PLAID_ENV, 'sandbox');
  assert.equal(process.env.WORTHLANE_HOSTED_SANDBOX_APPROVED, 'true');
  const apiRequire = createRequire(resolve('apps/api/package.json'));
  const dbRequire = createRequire(resolve('packages/db/package.json'));
  const { PrismaClient } = dbRequire('@prisma/client');
  const { PlaidApi, Configuration, PlaidEnvironments, Products } = apiRequire('plaid');
  const db = new PrismaClient();
  const plaid = new PlaidApi(new Configuration({ basePath: PlaidEnvironments.sandbox, baseOptions: {
    timeout: 20000, headers: { 'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID, 'PLAID-SECRET': process.env.PLAID_SECRET },
  } }));
  const origin = 'https://worthlane-beta-sandbox.up.railway.app';
  const webhook = origin + '/api/plaid/webhook';
  let userId, providerToken, itemId;
  let stage = 'registration';
  async function post(path, body, token) {
    const response = await fetch(origin + '/api' + path, { method: 'POST', headers: {
      'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}),
    }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) });
    assert(response.ok, 'API request failed');
    return (await response.json()).data;
  }
  async function waitFor(check) {
    for (let attempt = 0; attempt < 30; attempt++) {
      if (await check()) return;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('Webhook receipt deadline elapsed');
  }
  try {
    const session = await post('/auth/register', { email: `hosted-webhook-${randomUUID()}@worthlane.test`, password: randomBytes(32).toString('hex') });
    userId = session.user.id;
    stage = 'create Sandbox fixture';
    const created = await plaid.sandboxPublicTokenCreate({ institution_id: 'ins_109508', initial_products: [Products.Investments], options: { webhook } });
    // Retain a cleanup token even if the application exchange fails.
    const exchanged = await plaid.itemPublicTokenExchange({ public_token: created.data.public_token });
    providerToken = exchanged.data.access_token;
    assert(providerToken.startsWith('access-sandbox-'));
    // Store the same encrypted representation as the API; secrets stay in memory.
    const { createCipheriv, createHash } = require('node:crypto');
    const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
    assert(raw);
    const decoded = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw);
    const key = decoded.length === 32 ? decoded : createHash('sha256').update(decoded).digest();
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(providerToken, 'utf8'), cipher.final()]);
    const row = await db.plaidItem.create({ data: { userId, itemId: exchanged.data.item_id, institution: 'Disposable webhook test', accessTokenEncrypted: [iv, cipher.getAuthTag(), encrypted].map(value => value.toString('base64')).join('.') } });
    itemId = row.id;
    await post('/plaid/sync', { plaidItemId: itemId }, session.accessToken);
    const baseline = await db.account.count({ where: { userId } });
    assert.equal(baseline, 2);
    stage = 'reject unauthenticated notifications';
    for (const signature of [null, 'invalid-signature']) {
      const response = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json', ...(signature ? { 'plaid-verification': signature } : {}) }, body: JSON.stringify({ webhook_type: 'ITEM', webhook_code: 'USER_PERMISSION_REVOKED', item_id: row.itemId }), signal: AbortSignal.timeout(20000) });
      assert.equal(response.status, 401);
    }
    assert.equal(await db.account.count({ where: { userId } }), baseline);
    stage = 'signed provider revocation';
    const fired = await plaid.sandboxItemFireWebhook({ access_token: providerToken, webhook_type: 'ITEM', webhook_code: 'USER_PERMISSION_REVOKED' });
    assert.equal(fired.data.webhook_fired, true);
    await waitFor(async () => {
      const current = await db.plaidItem.findUnique({ where: { id: itemId } });
      return current?.errorCode === 'USER_PERMISSION_REVOKED' && current.consentRevision > 0;
    });
    assert.equal(await db.account.count({ where: { userId } }), 0);
    assert.equal(await db.transaction.count({ where: { userId } }), 0);
    console.log(JSON.stringify({ signedProviderRevocation: 'passed', unsignedRejected: true, invalidSignatureRejected: true, originalAccounts: baseline, remainingAccounts: 0, source: process.env.RAILWAY_GIT_COMMIT_SHA ?? null }));
  } catch {
    console.error(JSON.stringify({ result: 'failed', stage }));
    process.exitCode = 1;
  } finally {
    let providerRemoved = !providerToken;
    if (providerToken) {
      try { await plaid.itemRemove({ access_token: providerToken }); providerRemoved = true; }
      catch { console.error('Synthetic provider cleanup failed; retain fixture for cleanup.'); process.exitCode = 1; }
    }
    if (userId && providerRemoved) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
    console.log(JSON.stringify({ syntheticCleanup: providerRemoved ? 'completed' : 'incomplete' }));
  }
}
main().catch(() => { console.error('Hosted webhook check refused or failed; inspect only sanitized diagnostics.'); process.exitCode = 1; });

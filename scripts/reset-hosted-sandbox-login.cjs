// Run inside the explicitly isolated Railway API service, never on production.
// Supply only fixture IDs; credentials remain in the service environment/database.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { createDecipheriv, createHash } = require('node:crypto');

async function main() {
  assert.equal(process.env.RAILWAY_PROJECT_ID, 'a2386fda-ce79-4de5-b8c5-aef7ec8e8e3e', 'Wrong Railway project');
  assert.equal(process.env.RAILWAY_ENVIRONMENT_ID, 'dbeb62fc-92fb-4bb1-b630-eafa600c897b', 'Wrong Railway environment');
  assert.equal(process.env.RAILWAY_SERVICE_ID, '59dc5245-3e9e-4d69-8450-72c4c834aff1', 'Wrong Railway service');
  assert.equal(process.env.PLAID_ENV, 'sandbox', 'Sandbox required');
  assert.equal(process.env.WORTHLANE_HOSTED_SANDBOX_APPROVED, 'true', 'Explicit Sandbox test opt-in required');
  const [userId, itemId] = process.argv.slice(2);
  assert(userId && itemId && process.argv.length === 4, 'Pass exact synthetic user and saved Item IDs');
  const apiRequire = createRequire(resolve('apps/api/package.json'));
  const dbRequire = createRequire(resolve('packages/db/package.json'));
  const { PrismaClient } = dbRequire('@prisma/client');
  const db = new PrismaClient();
  try {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    assert(/^hosted-(?:partner-)?[0-9a-f-]{36}@worthlane\.test$/.test(user.email), 'Only a synthetic hosted owner or partner is allowed');
    const item = await db.plaidItem.findFirstOrThrow({ where: { id: itemId, userId } });
    const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
    assert(raw, 'Encryption key required');
    const decoded = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'utf8');
    const key = decoded.length === 32 ? decoded : createHash('sha256').update(decoded).digest();
    const parts = item.accessTokenEncrypted.split('.');
    assert.equal(parts.length, 3, 'Invalid encrypted token');
    const [iv, tag, data] = parts.map(part => Buffer.from(part, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const accessToken = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    assert(accessToken.startsWith('access-sandbox-'), 'Only Sandbox access tokens are allowed');
    const { PlaidApi, Configuration, PlaidEnvironments } = apiRequire('plaid');
    const client = new PlaidApi(new Configuration({ basePath: PlaidEnvironments.sandbox, baseOptions: {
      timeout: 20000, headers: { 'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID, 'PLAID-SECRET': process.env.PLAID_SECRET },
    } }));
    const result = await client.sandboxItemResetLogin({ access_token: accessToken });
    assert.equal(result.data.reset_login, true, 'Provider did not confirm reset');
    console.log('Synthetic hosted Sandbox Item reset. Verify native Sync exposes repair, then verify exact saved IDs after repair.');
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  // Provider/Prisma errors can contain credentials; never print raw error objects.
  console.error('Sandbox reset refused or failed. Verify the explicit service, environment, fixture IDs and provider response privately.');
  process.exitCode = 1;
});

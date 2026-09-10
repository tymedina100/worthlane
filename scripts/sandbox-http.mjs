import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { randomBytes, createDecipheriv } from 'node:crypto';

// Opt-in only: local HTTP browser acceptance with real Sandbox data and cleanup.
export async function sandboxHttp(databaseUrl) {
  const url = new URL(databaseUrl);
  assert(url.protocol === 'postgresql:' && url.hostname === '127.0.0.1' && url.pathname === '/worthlane_beta_test' && url.port);
  const require = createRequire(resolve('apps/api/package.json'));
  createRequire(require.resolve('next/package.json'))('@next/env').loadEnvConfig(resolve('apps/api'));
  assert(process.env.PLAID_ENV === 'sandbox', 'Explicit Sandbox configuration required');
  assert(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET, 'Sandbox credentials required');
  const { Configuration, PlaidApi, PlaidEnvironments, Products } = require('plaid');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const baseline = new Set((await prisma.plaidItem.findMany({ select: { id: true } })).map(item => item.id));
  const key = randomBytes(32);
  const plaid = new PlaidApi(new Configuration({ basePath: PlaidEnvironments.sandbox, baseOptions: { headers: { 'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID, 'PLAID-SECRET': process.env.PLAID_SECRET } } }));
  return {
    env: { PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID, PLAID_SECRET: process.env.PLAID_SECRET, PLAID_ENV: 'sandbox', PLAID_TOKEN_ENCRYPTION_KEY: key.toString('hex'), PLAID_WEBHOOK_URL: '' },
    async publicToken() {
      try { return (await plaid.sandboxPublicTokenCreate({ institution_id: 'ins_109508', initial_products: [Products.Transactions, Products.Liabilities] })).data.public_token; }
      catch { throw new Error('Sandbox fixture token creation failed; provider response omitted.'); }
    },
    async cleanup() {
      let failed = 0;
      try {
        for (const item of await prisma.plaidItem.findMany({ select: { id: true, accessTokenEncrypted: true } })) {
          if (baseline.has(item.id)) continue;
          try {
            const [iv, tag, encrypted] = item.accessTokenEncrypted.split('.').map(value => Buffer.from(value, 'base64'));
            const cipher = createDecipheriv('aes-256-gcm', key, iv); cipher.setAuthTag(tag);
            const token = Buffer.concat([cipher.update(encrypted), cipher.final()]).toString('utf8');
            await plaid.itemRemove({ access_token: token });
          } catch { failed++; }
        }
      } finally { await prisma.$disconnect(); }
      assert.equal(failed, 0, 'Some temporary Sandbox Items could not be removed; investigate before rerunning.');
      console.log('Temporary HTTP Sandbox Items removed.');
    },
  };
}

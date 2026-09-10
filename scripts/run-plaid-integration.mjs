import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const url = new URL(process.env.WORTHLANE_TEST_DATABASE_URL ?? 'http://invalid');
if (url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1' || url.pathname !== '/worthlane_beta_test' || !url.port) throw new Error('Use test-postgres.ps1 -Sandbox with an isolated test database.');
const apiRequire = createRequire(resolve('apps/api/package.json'));
createRequire(apiRequire.resolve('next/package.json'))('@next/env').loadEnvConfig(resolve('apps/api'));
if (process.env.PLAID_ENV !== 'sandbox') throw new Error('Live integration requires explicit PLAID_ENV=sandbox.');
if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) throw new Error('Sandbox credentials are required.');
const result = spawnSync(process.execPath, [resolve(dirname(apiRequire.resolve('vitest/package.json')), 'vitest.mjs'), 'run', '--config', 'vitest.sandbox.config.ts'], {
  cwd: resolve('apps/api'), stdio: 'inherit', windowsHide: true,
  env: { ...process.env, DATABASE_URL: url.toString(), PLAID_ENV: 'sandbox', PLAID_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('hex'), PLAID_WEBHOOK_URL: '', POSTHOG_PROJECT_KEY: '', SENTRY_DSN: '' },
});
process.exitCode = result.status ?? 1;

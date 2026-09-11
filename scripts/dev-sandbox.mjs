import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Persistent local-only development. Unlike test-http, stopping the server
// does not revoke connections. Use the app's unlink action to remove them.
const db = new URL(process.env.WORTHLANE_TEST_DATABASE_URL ?? 'http://invalid');
assert(db.protocol === 'postgresql:' && db.hostname === '127.0.0.1' && db.pathname === '/worthlane_beta_test' && db.port,
  'Set WORTHLANE_TEST_DATABASE_URL to the isolated localhost worthlane_beta_test database.');
const apiRequire = createRequire(resolve('apps/api/package.json'));
createRequire(apiRequire.resolve('next/package.json'))('@next/env').loadEnvConfig(resolve('apps/api'));
assert(process.env.PLAID_ENV === 'sandbox' && process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET,
  'Configure Sandbox credentials in the ignored apps/api/.env.local first.');
const secretPath = resolve('.tmp/sandbox-development-secrets.json');
mkdirSync(resolve('.tmp'), { recursive: true });
if (!existsSync(secretPath)) {
  const secrets = Object.fromEntries(['JWT_SECRET', 'JWT_REFRESH_SECRET', 'PLAID_TOKEN_ENCRYPTION_KEY', 'WORTHLANE_DESKTOP_PROXY_SECRET']
    .map(name => [name, randomBytes(32).toString('hex')]));
  writeFileSync(secretPath, JSON.stringify(secrets), { mode: 0o600, flag: 'wx' });
}
chmodSync(secretPath, 0o600);
const secrets = JSON.parse(readFileSync(secretPath, 'utf8'));
for (const name of ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'PLAID_TOKEN_ENCRYPTION_KEY', 'WORTHLANE_DESKTOP_PROXY_SECRET']) {
  assert(typeof secrets[name] === 'string' && /^[a-f0-9]{64}$/.test(secrets[name]), `Invalid persisted local ${name}`);
}
const env = { ...process.env, ...secrets, DATABASE_URL: db.href, NODE_ENV: 'development',
  PLAID_ENV: 'sandbox', WORTHLANE_API_URL: 'http://127.0.0.1:3301/api', NEXT_TELEMETRY_DISABLED: '1',
  POSTHOG_PROJECT_KEY: '', SENTRY_DSN: '', SENTRY_AUTH_TOKEN: '', VERCEL: '',
  // Never inherit production webhook delivery from another environment.
  PLAID_WEBHOOK_URL: process.env.WORTHLANE_SANDBOX_WEBHOOK_URL ?? '',
};
for (const port of [3301, 3303]) {
  try { await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1000) }); throw new Error(`Port ${port} is occupied. Stop that server first.`); }
  catch (error) { if (error.message.includes('occupied')) throw error; }
}
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
}
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
for (const [app, host, port] of [['api', '127.0.0.1', 3301], ['desktop', 'localhost', 3303]]) {
  const cwd = resolve('apps', app);
  const require = createRequire(resolve(cwd, 'package.json'));
  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '-H', host, '-p', String(port)], { cwd, env, stdio: 'inherit' });
  children.push(child);
  child.on('error', () => stop(1));
  child.on('exit', code => { if (!stopping) stop(code || 1); });
}
console.log('Persistent local Sandbox: desktop http://localhost:3303; mobile API http://localhost:3301/api.');
console.log('Local secrets stay in .tmp/sandbox-development-secrets.json. Retain this file to reopen saved connections.');
console.log(`iOS return URL: ${env.PLAID_IOS_REDIRECT_URI ? 'configured; dashboard/domain verification still required' : 'missing; native Link setup still required'}.`);

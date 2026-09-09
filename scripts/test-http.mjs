import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, openSync, closeSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const db = new URL(process.env.WORTHLANE_TEST_DATABASE_URL ?? 'http://invalid');
assert(db.protocol === 'postgresql:' && db.hostname === '127.0.0.1' && db.pathname === '/worthlane_beta_test');
const api = 'http://127.0.0.1:3301';
const desktop = 'http://localhost:3303';
const children = [];
const logs = [];
const env = { ...process.env, DATABASE_URL: db.href, NODE_ENV: 'development',
  WORTHLANE_API_URL: `${api}/api`, NEXT_TELEMETRY_DISABLED: '1',
  JWT_SECRET: 'http-integration-only-access-secret-32-characters',
  JWT_REFRESH_SECRET: 'http-integration-only-refresh-secret-32-characters',
  POSTHOG_PROJECT_KEY: '', SENTRY_DSN: '', SENTRY_AUTH_TOKEN: '', VERCEL: '',
  PLAID_ENV: 'sandbox', PLAID_CLIENT_ID: '', PLAID_SECRET: '',
};
async function start(app, port, health) {
  try { await fetch(health, { signal: AbortSignal.timeout(1000) }); throw new Error(`Test port ${port} already occupied`); }
  catch (error) { if (error.message.includes('already occupied')) throw error; }
  const cwd = resolve('apps', app);
  const require = createRequire(resolve(cwd, 'package.json'));
  const log = openSync(resolve('.tmp', `http-${app}.log`), 'w'); logs.push(log);
  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '-H', new URL(health).hostname, '-p', String(port)],
    { cwd, env, windowsHide: true, stdio: ['ignore', log, log] });
  children.push(child);
  for (let attempt = 0; attempt < 90; attempt++) {
    if (child.exitCode !== null) throw new Error(`${app} exited; inspect .tmp/http-${app}.log`);
    try { const response = await fetch(health, { signal: AbortSignal.timeout(2000) }); if (response.status < 500) return; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`${app} readiness timed out; inspect local log`);
}
function client(base) {
  const jar = new Map();
  return async (path, { method = 'GET', body, token, status = 200, origin = base } = {}) => {
    const response = await fetch(`${base}${path}`, { method,
      headers: { 'content-type': 'application/json', origin,
        cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
        ...(token ? { authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(60_000),
    });
    assert.equal(response.status, status, `${method} ${path} status`);
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';'); const split = pair.indexOf('=');
      jar.set(pair.slice(0, split), pair.slice(split + 1));
      if (base === desktop && !cookie.includes('Max-Age=0')) assert.match(cookie, /HttpOnly/i);
    }
    return response.json();
  };
}
mkdirSync('.tmp', { recursive: true });
try {
  await start('api', 3301, `${api}/api/accounts`);
  await start('desktop', 3303, `${desktop}/login`);
  const browser = client(desktop); const backend = client(api); const stranger = client(desktop);
  const email = `http-${randomUUID()}@worthlane.local`; const password = 'Synthetic-http-passphrase!2026';
  const registration = await browser('/api/auth/register', { method: 'POST', body: { email, password }, status: 201 });
  assert(registration.data.user.id);
  assert(!JSON.stringify(registration).includes('accessToken'), 'BFF must not expose tokens');
  const session = await backend('/api/auth/login', { method: 'POST', body: { email, password } });
  const token = session.data.accessToken;
  const account = await backend('/api/accounts', { method: 'POST', token, status: 201,
    body: { name: 'HTTP synthetic checking', type: 'CHECKING', currentBalance: 100 } });
  const transaction = await backend('/api/transactions', { method: 'POST', token, status: 201,
    body: { accountId: account.data.id, amount: -12.34, date: new Date().toISOString() } });
  const path = `/api/personal/manage/transactions/${transaction.data.id}`;
  await stranger(path, { method: 'PATCH', body: { spendingTreatment: 'REFUND' }, status: 401 });
  await browser(path, { method: 'PATCH', origin: 'https://untrusted.invalid', body: { spendingTreatment: 'REFUND' }, status: 403 });
  await browser(path, { method: 'PATCH', body: { amount: 500 }, status: 400 });
  await browser(path, { method: 'PATCH', body: { spendingTreatment: 'REFUND' } });
  const read = await browser('/api/personal/transactions');
  assert.equal(read.data.transactions.find(t => t.id === transaction.data.id).spendingTreatment, 'REFUND');
  await browser('/api/auth/logout', { method: 'POST' });
  await browser('/api/personal/transactions', { status: 401 });
  await browser('/api/auth/login', { method: 'POST', body: { email, password } });
  const restored = await browser('/api/personal/transactions');
  assert.equal(restored.data.transactions.find(t => t.id === transaction.data.id).spendingTreatment, 'REFUND');
  await browser('/api/household/create', { method: 'POST', status: 201,
    body: { name: 'HTTP couple', displayName: 'Alex', timezone: 'America/Phoenix', currency: 'USD' } });
  const partnerEmail = `late-${randomUUID()}@worthlane.local`;
  const invitation = await browser('/api/household/manage/partners/link', { method: 'POST', status: 202,
    body: { email: partnerEmail, displayName: 'Sam' } });
  assert.match(invitation.data.invitationCode, /^[a-f0-9]{48}$/);
  const partner = client(desktop);
  await partner('/api/auth/register', { method: 'POST', status: 201, body: { email: partnerEmail, password } });
  await partner('/api/household/summary', { status: 404 });
  await partner('/api/household/manage/invitations/accept', { method: 'POST',
    body: { invitationCode: invitation.data.invitationCode } });
  const joined = await partner('/api/household/summary');
  assert.equal(joined.data.members.length, 2);
  assert.equal(joined.data.finances.detailedAccounts.length, 0, 'Partner must not inherit private account detail');
  await partner('/api/auth/logout', { method: 'POST' });
  await partner('/api/auth/login', { method: 'POST', body: { email: partnerEmail, password } });
  assert.equal((await partner('/api/household/summary')).data.household.id, joined.data.household.id);
  console.log('PASS: BFF invitation before registration, code acceptance, two-member household, private account isolation, partner login persistence.');
  console.log('PASS: real HTTP registration, HttpOnly session, BFF validation/origin/auth checks, refund save, logout denial, login persistence.');
  if (process.argv.includes('--interactive')) {
    const stopFile = resolve('.tmp', `stop-http-${process.pid}`);
    console.log(`Interactive test app ready at ${desktop}/register. Create ${stopFile} to stop. Auto-stop after 15 minutes.`);
    const deadline = Date.now() + 15 * 60_000;
    while (!existsSync(stopFile) && Date.now() < deadline) await new Promise(r => setTimeout(r, 1000));
  }
} finally {
  for (const child of children.reverse()) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
  for (const log of logs) closeSync(log);
}

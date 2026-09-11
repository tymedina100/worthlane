import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, openSync, closeSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const db = new URL(process.env.WORTHLANE_TEST_DATABASE_URL ?? 'http://invalid');
assert(db.protocol === 'postgresql:' && db.hostname === '127.0.0.1' && db.pathname === '/worthlane_beta_test');
const apiPort = Number(process.env.WORTHLANE_HTTP_API_PORT ?? 3316);
const desktopPort = Number(process.env.WORTHLANE_HTTP_DESKTOP_PORT ?? 3317);
assert([apiPort, desktopPort].every(port => Number.isInteger(port) && port > 1024 && port < 65536) && apiPort !== desktopPort,
  'HTTP test ports must be distinct integers between1025 and65535');
const api = `http://127.0.0.1:${apiPort}`;
const desktop = `http://localhost:${desktopPort}`;
const children = [];
const logs = [];
const distDir = `.next-http-${process.pid}`;
const generatedInputs = ['api', 'desktop'].flatMap(app => ['tsconfig.json', 'next-env.d.ts']
  .map(name => resolve('apps', app, name))).filter(existsSync)
  .map(path => ({ path, original: readFileSync(path, 'utf8') }));
function restoreGeneratedInputs() {
  for (const { path, original } of generatedInputs) {
    const current = readFileSync(path, 'utf8');
    if (current === original) continue;
    let safe = current.replaceAll(distDir, '.next') === original;
    if (path.endsWith('tsconfig.json')) {
      const normalize = text => {
        const config = JSON.parse(text);
        config.include = [...new Set((config.include ?? []).filter(value => !value.startsWith(`${distDir}/`)))].sort();
        return JSON.stringify(config);
      };
      safe = normalize(current) === normalize(original);
    }
    if (safe) writeFileSync(path, original);
    else console.warn(`Preserved concurrent changes in ${path}; inspect generated test references.`);
  }
}
const interactiveMinutes = Number(process.argv.find(arg => arg.startsWith('--interactive-minutes='))?.split('=')[1] ?? 15);
assert(Number.isInteger(interactiveMinutes) && interactiveMinutes >= 1 && interactiveMinutes <= 120, 'Interactive duration must be 1-120 minutes');
assert(!process.argv.includes('--sandbox') || process.argv.includes('--interactive'), 'Sandbox HTTP requires interactive mode');
const sandbox = process.argv.includes('--sandbox') ? await (await import('./sandbox-http.mjs')).sandboxHttp(db.href) : null;
const env = { ...process.env, DATABASE_URL: db.href, NODE_ENV: 'development',
  WORTHLANE_HTTP_DIST_DIR: distDir,
  WORTHLANE_API_URL: `${api}/api`, NEXT_TELEMETRY_DISABLED: '1',
  JWT_SECRET: 'http-integration-only-access-secret-32-characters',
  JWT_REFRESH_SECRET: 'http-integration-only-refresh-secret-32-characters',
  POSTHOG_PROJECT_KEY: '', SENTRY_DSN: '', SENTRY_AUTH_TOKEN: '', VERCEL: '',
  PLAID_ENV: 'sandbox', PLAID_CLIENT_ID: '', PLAID_SECRET: '',
  ...(sandbox?.env ?? {}),
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
  await start('api', apiPort, `${api}/api/accounts`);
  await start('desktop', desktopPort, `${desktop}/login`);
  const browser = client(desktop); const backend = client(api); const stranger = client(desktop);
  await stranger('/api/plaid/link-token', { method: 'POST', status: 401, body: { platform: 'web', mode: 'create' } });
  await stranger('/api/plaid/exchange', { method: 'POST', status: 401, body: { publicToken: 'synthetic-token' } });
  await stranger('/api/plaid/link-token', { method: 'POST', status: 403, origin: 'https://untrusted.invalid', body: { platform: 'web', mode: 'create' } });
  await stranger('/api/plaid/link-token', { method: 'POST', status: 400, body: { platform: 'web', mode: 'update' } });
  await stranger('/api/plaid/link-token', { method: 'POST', status: 400, body: { platform: 'ios', mode: 'create' } });
  await stranger('/api/plaid/exchange', { method: 'POST', status: 400, body: { publicToken: 'synthetic-token', accessToken: 'not-accepted' } });
  await stranger('/api/plaid/link-token', { method: 'POST', status: 400, body: { platform: 'web', mode: 'create', includeLiabilities: 'true' } });
  await stranger('/api/plaid/link-token', { method: 'POST', status: 401, body: { platform: 'web', mode: 'create', includeLiabilities: true } });
  console.log('PASS: Link/exchange BFF authentication, origin and narrow payload validation.');
  await stranger('/api/plaid/items/missing/liabilities', { method: 'POST', status: 401, body: {} });
  await stranger('/api/plaid/items/missing/liabilities', { method: 'POST', status: 403, origin: 'https://untrusted.invalid', body: {} });
  await stranger('/api/plaid/items/missing/liabilities', { method: 'POST', status: 400, body: { accessToken: 'forged' } });
  const email = `http-${randomUUID()}@worthlane.local`; const password = 'Synthetic-http-passphrase!2026';
  const registration = await browser('/api/auth/register', { method: 'POST', body: { email, password }, status: 201 });
  assert(registration.data.user.id);
  await browser('/api/plaid/items/missing/liabilities', { method: 'POST', status: 404, body: {} });
  assert(!JSON.stringify(registration).includes('accessToken'), 'BFF must not expose tokens');
  const session = await backend('/api/auth/login', { method: 'POST', body: { email, password } });
  const token = session.data.accessToken;
  const duplicatePath = '/api/personal/manage/transactions/duplicates';
  const duplicateBody = { manualId: 'missing-manual', bankId: 'missing-bank', manualUpdatedAt: '2026-09-09T12:00:00.000Z', bankUpdatedAt: '2026-09-09T12:00:00.000Z' };
  await stranger(duplicatePath, { status: 401 });
  await stranger(duplicatePath, { method: 'POST', body: duplicateBody, status: 401 });
  await browser(duplicatePath, { method: 'POST', body: duplicateBody, origin: 'https://untrusted.invalid', status: 403 });
  await browser(duplicatePath, { method: 'POST', body: { ...duplicateBody, userId: 'forged' }, status: 400 });
  await browser(duplicatePath, { method: 'POST', body: duplicateBody, status: 404 });
  const duplicates = await browser(duplicatePath);
  assert.deepEqual(duplicates.data, { entries: [], nextCursor: null, reviewedCount: 0 });
  console.log('PASS: duplicate review BFF authentication, origin, payload validation and owner-scoped response.');
  const account = await backend('/api/accounts', { method: 'POST', token, status: 201,
    body: { name: 'HTTP synthetic checking', type: 'CHECKING', currentBalance: 100 } });
  const categories = await browser('/api/personal/categories');
  const manualInput = { accountId: account.data.id, categoryId: categories.data[0].id,
    amount: 23.47, date: new Date().toISOString(), merchantName: 'Manual BFF purchase', spendingTreatment: 'AUTO' };
  await stranger('/api/personal/transactions', { method: 'POST', body: manualInput, status: 401 });
  await browser('/api/personal/transactions', { method: 'POST', body: manualInput, origin: 'https://untrusted.invalid', status: 403 });
  for (const invalid of [{ userId: 'forged' }, { amount: 1.234 }, { amount: 0 }, { spendingTreatment: 'REFUND' }]) {
    await browser('/api/personal/transactions', { method: 'POST', body: { ...manualInput, ...invalid }, status: 400 });
  }
  const manual = await browser('/api/personal/transactions', { method: 'POST', body: manualInput, status: 201 });
  const refund = await browser('/api/personal/transactions', { method: 'POST', body: { ...manualInput, amount: -3.47, spendingTreatment: 'REFUND' }, status: 201 });
  const savedActivity = (await browser('/api/personal/transactions')).data.transactions;
  assert.equal(savedActivity.find(row => row.id === manual.data.id).amount, 23.47);
  assert.equal(savedActivity.find(row => row.id === refund.data.id).spendingTreatment, 'REFUND');
  console.log('PASS: manual activity BFF create/refund persistence, auth, origin, strict payload and cents.');
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
  await partner('/api/personal/transactions', { method: 'POST', body: manualInput, status: 404 });
  const partnerSession = await backend('/api/auth/login', { method: 'POST', body: { email: partnerEmail, password } });
  const privateCategory = await backend('/api/categories', { method: 'POST', token: partnerSession.data.accessToken, status: 201,
    body: { name: 'Partner private category', icon: 'P', color: '#123456' } });
  for (const categoryId of [privateCategory.data.id, 'missing-category']) {
    await browser('/api/personal/transactions', { method: 'POST', body: { ...manualInput, categoryId }, status: 404 });
    await backend(`/api/transactions/${manual.data.id}`, { method: 'PATCH', token, body: { categoryId }, status: 404 });
  }
  const personalCategory = await backend('/api/categories', { method: 'POST', token, status: 201,
    body: { name: 'My private category', icon: 'M', color: '#654321' } });
  await backend(`/api/transactions/${manual.data.id}`, { method: 'PATCH', token, body: { categoryId: personalCategory.data.id } });
  const categoryReadback = (await browser('/api/personal/transactions')).data.transactions.find(row => row.id === manual.data.id);
  assert.equal(categoryReadback.category.id, personalCategory.data.id);
  await backend(`/api/transactions/${manual.data.id}`, { method: 'PATCH', token, body: { categoryId: null } });
  assert.equal((await browser('/api/personal/transactions')).data.transactions.find(row => row.id === manual.data.id).category, null);
  console.log('PASS: transaction categories reject partner-private and missing IDs, allow own categories and clearing.');
  assert.equal(joined.data.members.length, 2);
  assert.equal(joined.data.finances.detailedAccounts.length, 0, 'Partner must not inherit private account detail');
  await partner('/api/auth/logout', { method: 'POST' });
  await partner('/api/auth/login', { method: 'POST', body: { email: partnerEmail, password } });
  assert.equal((await partner('/api/household/summary')).data.household.id, joined.data.household.id);
  console.log('PASS: BFF invitation before registration, code acceptance, two-member household, private account isolation, partner login persistence.');
  const planInput = { name: 'HTTP payoff', startMonth: '2026-09', strategy: 'AVALANCHE', monthlyPaymentMinor: 3000, debts: [{ id: 'card', name: 'Synthetic card', balanceMinor: 10000, minimumPaymentMinor: 1000, aprBasisPoints: 0 }] };
  await partner('/api/debt-plans', { method: 'POST', status: 400, body: { ...planInput, userId: 'forged' } });
  const plan = await browser('/api/debt-plans', { method: 'POST', status: 201, body: planInput });
  assert.equal(plan.data.estimate.payoffMonth, '2026-12');
  await partner(`/api/debt-plans/${plan.data.id}`, { status: 404 });
  const revisedPlan = await browser(`/api/debt-plans/${plan.data.id}`, { method: 'PATCH', body: { revision: 1, input: { ...planInput, monthlyPaymentMinor: 5000 } } });
  assert.equal(revisedPlan.data.revision, 2);
  await browser(`/api/debt-plans/${plan.data.id}`, { method: 'PATCH', status: 409, body: { revision: 1, input: planInput } });
  assert.equal((await browser(`/api/debt-plans/${plan.data.id}`)).data.input.monthlyPaymentMinor, 5000);
  console.log('PASS: debt-plan BFF create, reopen, owner isolation, strict input and revision conflict.');
  await stranger('/api/upcoming', { status: 401 });
  const dueInput = { name: 'HTTP due', amount: 12.34, dueDate: '2026-09-20', frequency: null, reminderTiming: 'NONE' };
  await browser('/api/upcoming', { method: 'POST', status: 403, origin: 'https://untrusted.invalid', body: dueInput });
  await browser('/api/upcoming', { method: 'POST', status: 400, body: { ...dueInput, userId: 'forged' } });
  const due = await browser('/api/upcoming', { method: 'POST', status: 201, body: dueInput });
  const duePath = `/api/upcoming/${due.data.id}`;
  await partner(duePath, { method: 'PATCH', status: 404, body: { amount: 90, expectedUpdatedAt: due.data.updatedAt } });
  await partner(duePath, { method: 'POST', status: 404, body: { action: 'markPaid', expectedUpdatedAt: due.data.updatedAt } });
  assert(!(await partner('/api/upcoming')).data.items.some(item => item.id === due.data.id));
  let dueVersion = (await browser(duePath, { method: 'PATCH', body: { amount: 15, reminderTiming: null, expectedUpdatedAt: due.data.updatedAt } })).data.updatedAt;
  await browser(duePath, { method: 'PATCH', status: 409, body: { amount: 999, expectedUpdatedAt: due.data.updatedAt } });
  const paidVersion = dueVersion;
  dueVersion = (await browser(duePath, { method: 'POST', body: { action: 'markPaid', expectedUpdatedAt: dueVersion } })).data.updatedAt;
  await browser(duePath, { method: 'POST', status: 409, body: { action: 'markPaid', expectedUpdatedAt: paidVersion } });
  let persistedDue = (await browser('/api/upcoming')).data.items.find(item => item.id === due.data.id);
  assert.equal(persistedDue.amount, 15); assert.equal(persistedDue.isPaid, true); assert.equal(persistedDue.reminderTiming, null);
  dueVersion = (await browser(duePath, { method: 'POST', body: { action: 'markUnpaid', expectedUpdatedAt: dueVersion } })).data.updatedAt;
  await browser(duePath, { method: 'PATCH', body: { isActive: false, expectedUpdatedAt: dueVersion } });
  persistedDue = (await browser('/api/upcoming')).data.items.find(item => item.id === due.data.id);
  assert.equal(persistedDue.isPaid, false); assert.equal(persistedDue.isActive, false); assert.equal(persistedDue.type, 'BILL');
  console.log('PASS: Upcoming BFF create, edit, paid/unpaid, deactivate, reminder preservation, partner isolation, auth/origin/strict validation.');

  console.log('PASS: real HTTP registration, HttpOnly session, BFF validation/origin/auth checks, refund save, logout denial, login persistence.');
  if (process.argv.includes('--interactive')) {
    if (sandbox) {
      await browser('/api/plaid/exchange', { method: 'POST', status: 201, body: { publicToken: await sandbox.publicToken(), institutionName: 'Synthetic Sandbox Bank' } });
      console.log(`Synthetic browser fixture login: ${email} / ${password}`);
    }
    const stopFile = resolve('.tmp', `stop-http-${process.pid}`);
    console.log(`Interactive test app ready at ${desktop}/register. Create ${stopFile} to stop. Auto-stop after ${interactiveMinutes} minutes.`);
    const deadline = Date.now() + interactiveMinutes * 60_000;
    while (!existsSync(stopFile) && Date.now() < deadline) await new Promise(r => setTimeout(r, 1000));
  }
} finally {
  for (const child of children.reverse()) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
  for (const log of logs) closeSync(log);
  restoreGeneratedInputs();
  if (sandbox) await sandbox.cleanup();
}

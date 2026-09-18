import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Only the specifically approved, isolated frontend. Never accept a host override.
const origin = 'https://worthlane-beta-desktop.vercel.app';
const access = '__Host-worthlane-access';
const refresh = '__Host-worthlane-refresh';
const sessions = [];
const check = (condition, message) => assert(condition, message);

async function request(path, jar = new Map(), body, expected = 200, requestOrigin = origin) {
  const response = await fetch(`${origin}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    redirect: 'manual',
    headers: {
      cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '),
      ...(body === undefined ? {} : { origin: requestOrigin, 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30_000),
  });
  check(response.status === expected, `${path}: unexpected HTTP ${response.status}`);
  for (const cookie of response.headers.getSetCookie()) {
    const [pair, ...attributes] = cookie.split(';');
    const index = pair.indexOf('=');
    const key = pair.slice(0, index);
    if (![access, refresh, '__Host-worthlane-plaid-oauth'].includes(key)) continue;
    const flags = attributes.map(a => a.trim().toLowerCase());
    check(flags.includes('httponly') && flags.includes('secure') && flags.includes('path=/') && flags.includes('samesite=lax'), 'Session cookie protections missing');
    check(!flags.some(a => a.startsWith('domain=')), 'Host cookie must not have a Domain attribute');
    if (flags.includes('max-age=0')) jar.delete(key);
    else jar.set(key, pair.slice(index + 1));
  }
  return response;
}
async function data(path, jar) { return (await (await request(path, jar)).json()).data; }
function ids(rows) { return rows.map(row => row.id).sort(); }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

try {
  check(process.env.WORTHLANE_HOSTED_SANDBOX_APPROVED === 'true', 'Explicit hosted Sandbox approval flag required');
  const fixture = JSON.parse(readFileSync('.tmp/hosted-sandbox-fixture.json', 'utf8'));
  check(fixture.origin === 'https://worthlane-beta-sandbox.up.railway.app' && fixture.coupleComplete, 'Completed isolated Sandbox couple fixture required');
  check([fixture, fixture.partner].every(user => user.email?.endsWith('@worthlane.test') && user.password && user.userId), 'Only existing synthetic test logins allowed');
  const identity = await request('/login');
  check(identity.headers.get('x-worthlane-desktop') === '1', 'Hosted origin is not serving the Worthlane desktop BFF');
  await request('/api/household/summary', new Map(), undefined, 401);
  // Reject before authentication; deliberately send no real fixture credentials.
  await request('/api/auth/login', new Map(), {}, 403, 'https://untrusted.example');
  const snapshots = [];
  for (const user of [fixture, fixture.partner]) {
    const jar = new Map();
    sessions.push(jar);
    const login = await (await request('/api/auth/login', jar, { email: user.email, password: user.password })).json();
    check(login.data?.user?.id === user.userId, 'Unexpected synthetic login identity');
    check(!JSON.stringify(login).includes('Token'), 'Login response exposed a token field');
    check(jar.has(access) && jar.has(refresh), 'Both secure session cookies required');
    const summary = await data('/api/household/summary', jar);
    check(summary.household.id === fixture.householdId && summary.members.length === 2, 'Saved two-person household missing');
    check(summary.responsibilities.reduce((sum, row) => sum + row.monthlyAmountMinor, 0) === 245000, 'Saved household responsibility must total $2450 once');
    const accounts = await data('/api/personal/accounts', jar);
    const expectedIds = user === fixture ? fixture.accountIds : fixture.partner.nativeLink.accountIds;
    check(same(ids(accounts.accounts), [...expectedIds].sort()), 'Private account snapshot differs from fixture');
    const ledger = await data('/api/personal/transactions?limit=1000', jar);
    check(ledger.total <= 1000 && ledger.transactions.length === ledger.total && new Set(ids(ledger.transactions)).size === ledger.total, 'Ledger is truncated or duplicated');
    // Simulate access expiry without waiting 15 minutes; BFF must rotate refresh
    // credentials and recover the same persisted account IDs.
    const oldRefresh = jar.get(refresh);
    jar.delete(access);
    check(same(ids((await data('/api/personal/accounts', jar)).accounts), expectedIds.slice().sort()), 'Refresh changed account visibility');
    check(jar.has(access) && jar.get(refresh) !== oldRefresh, 'BFF did not rotate and restore session cookies');
    snapshots.push({ accounts: ids(accounts.accounts), ledger: ids(ledger.transactions), responsibilities: summary.responsibilities });
  }
  check(same(snapshots[0].responsibilities, snapshots[1].responsibilities), 'Partners disagree on saved responsibility rules');
  for (const key of ['accounts', 'ledger']) check(snapshots[0][key].every(id => !snapshots[1][key].includes(id)), 'Private financial rows leaked across logins');
  for (const jar of sessions) {
    const stale = new Map([[refresh, jar.get(refresh)]]);
    await request('/api/auth/logout', jar, {});
    check(!jar.has(access) && !jar.has(refresh), 'Logout left session cookies behind');
    await request('/api/household/summary', stale, undefined, 401);
  }
  console.log('PASS: isolated HTTPS BFF, protected cookies, cross-origin rejection, persisted two-login privacy/totals, refresh rotation and logout revocation. Interactive UI/Plaid acceptance remains separate.');
} catch (error) {
  console.error(error instanceof assert.AssertionError ? error.message : 'Hosted desktop verification failed; sensitive details omitted.');
  process.exitCode = 1;
} finally {
  // Revoke only sessions created by this runner, including after partial failure.
  for (const jar of sessions) if (jar.has(refresh)) {
    try { await request('/api/auth/logout', jar, {}); }
    catch { console.error('Test session cleanup could not be confirmed.'); process.exitCode = 1; }
  }
}

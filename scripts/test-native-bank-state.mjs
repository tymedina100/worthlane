import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.createSourceFile('profile.tsx', readFileSync(new URL('../apps/mobile/app/(tabs)/profile.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const nodes = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node)) nodes.set(node.name.getText(source), node.initializer);
  ts.forEachChild(node, visit);
}
visit(source);
const print = node => ts.createPrinter().printNode(ts.EmitHint.Expression, node, source);
function fixture(name = 'syncMutation') {
  let currentUser = 'avery';
  const refreshed = []; const alerts = []; const requests = [];
  let release;
  const refreshGate = new Promise(resolve => { release = resolve; });
  const exports = {};
  const code = ts.transpileModule(`const invalidateWorthlaneQueries = ${print(nodes.get('invalidateWorthlaneQueries'))}; exports.options = ${print(nodes.get(name).arguments[0])};`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, {
    exports, useAuthStore: { getState: () => ({ userId: currentUser }) },
    queryClient: { invalidateQueries: async ({ queryKey }) => { refreshed.push(queryKey[0]); await refreshGate; } },
    Alert: { alert: (...args) => alerts.push(args) }, bankActionErrorMessage: error => error.message,
    api: { post: async (...args) => { requests.push(args); return { synced: true }; } },
  });
  return { ...exports, refreshed, alerts, requests, release, switchUser: () => { currentUser = 'morgan'; } };
}
const dependencies = ['accounts', 'transactions', 'dashboard', 'household-summary', 'budgets', 'net-worth', 'reports', 'recurring'];

test('failed native sync refreshes financial views before presenting the repair error', async () => {
  const f = fixture(); const context = f.options.onMutate();
  const completion = f.options.onSettled(undefined, new Error('Reconnect your bank'), 'synthetic-item', context);
  assert.deepEqual(new Set(f.refreshed), new Set(dependencies));
  assert.equal(f.alerts.length, 0, 'do not show a failure against stale Healthy data');
  f.release(); await completion;
  assert.deepEqual(f.alerts, [['Could not sync', 'Reconnect your bank']]);
});

test('successful native sync refreshes the same views without a failure alert', async () => {
  const f = fixture(); const context = f.options.onMutate();
  await f.options.mutationFn('synthetic-item');
  assert.equal(f.requests[0][0], '/plaid/sync');
  assert.equal(f.requests[0][1].plaidItemId, 'synthetic-item');
  const completion = f.options.onSettled({}, null, 'synthetic-item', context);
  f.release(); await completion;
  assert.deepEqual(new Set(f.refreshed), new Set(dependencies));
  assert.equal(f.alerts.length, 0);
});

test('a late bank result cannot refresh or report errors in another login', async () => {
  for (const name of ['syncMutation', 'unlinkMutation']) {
    const f = fixture(name); const context = f.options.onMutate(); f.switchUser();
    await f.options.onSettled(undefined, new Error('Old private bank error'), 'synthetic-item', context);
    assert.deepEqual(f.refreshed, []); assert.deepEqual(f.alerts, []);
  }
});

test('changing login during a refresh suppresses the old bank error', async () => {
  const f = fixture(); const completion = f.options.onSettled(undefined, new Error('Old private bank error'), 'synthetic-item', f.options.onMutate());
  f.switchUser(); f.release(); await completion;
  assert.equal(f.alerts.length, 0);
});

test('unlink refreshes household and personal totals even after an uncertain request result', async () => {
  const f = fixture('unlinkMutation');
  const completion = f.options.onSettled(undefined, new Error('Connection interrupted'), 'synthetic-item', f.options.onMutate());
  f.release(); await completion;
  assert.deepEqual(new Set(f.refreshed), new Set(dependencies));
});

function launchFixture() {
  let currentUser = 'avery';
  const requests = [], sessions = [], opened = [], busy = [], alerts = [];
  let rejectToken = false, failOpen = false;
  let releaseToken, releaseCreate;
  const tokenGate = new Promise(resolve => { releaseToken = resolve; });
  const createGate = new Promise(resolve => { releaseCreate = resolve; });
  const exports = {};
  vm.runInNewContext(ts.transpileModule(`exports.launch = ${print(nodes.get('launchPlaid'))};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, plaidLaunching: { current: false }, setOpeningPlaid: value => busy.push(value),
    useAuthStore: { getState: () => ({ userId: currentUser }) }, Platform: { OS: 'ios' },
    api: { post: async (...args) => { requests.push(args); await tokenGate; if (rejectToken) throw new Error('Token unavailable'); return { linkToken: 'synthetic' }; } },
    require: () => ({ createPlaidLinkSession: async options => {
      sessions.push(options); await createGate;
      return { open: async () => { if (failOpen) throw new Error('Presentation unavailable'); opened.push(true); } };
    } }),
    tracePlaidDevelopmentEvent: () => {}, handlePlaidSuccess: () => {}, handlePlaidExit: () => {},
    Alert: { alert: (...args) => alerts.push(args) }, bankActionErrorMessage: e => e.message,
  });
  return { ...exports, requests, sessions, opened, busy, alerts, releaseToken, releaseCreate,
    switchUser: () => { currentUser = 'morgan'; }, rejectToken: value => { rejectToken = value; }, failOpen: value => { failOpen = value; } };
}

test('overlapping bank, investment and repair taps create only one native session', async () => {
  const f = launchFixture(); const pending = f.launch('create');
  const investment = f.launch('create', undefined, 'investments');
  const repair = f.launch('update', 'synthetic-item');
  const tokenRequests = f.requests.length;
  f.releaseToken(); await new Promise(resolve => setImmediate(resolve));
  const createdSessions = f.sessions.length;
  const another = f.launch('create');
  const creationRequests = f.requests.length;
  f.releaseCreate(); await Promise.all([pending, investment, repair, another]);
  assert.equal(tokenRequests, 1);
  assert.equal(createdSessions, 1);
  assert.equal(creationRequests, 1, 'lock remains while the SDK creates its session');
  assert.equal(f.opened.length, 1);
  assert.deepEqual(f.busy, [true, false]);
});

test('token and presentation failures release the launch guard for retry', async () => {
  for (const failure of ['rejectToken', 'failOpen']) {
    const f = launchFixture(); f[failure](true); f.releaseToken(); f.releaseCreate();
    await f.launch('create'); assert.equal(f.alerts.length, 1);
    f[failure](false); await f.launch('create');
    assert.equal(f.requests.length, 2); assert.equal(f.opened.length, 1);
    assert.deepEqual(f.busy, [true, false, true, false]);
  }
});

test('login change while obtaining a token skips native launch and releases the guard', async () => {
  const f = launchFixture(); const pending = f.launch('create'); f.switchUser();
  f.releaseToken(); f.releaseCreate(); await pending;
  assert.equal(f.sessions.length, 0); assert.equal(f.alerts.length, 0);
  await f.launch('create'); assert.equal(f.opened.length, 1);
});

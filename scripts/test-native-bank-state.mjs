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

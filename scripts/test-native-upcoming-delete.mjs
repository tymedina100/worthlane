import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual mutation callbacks with controlled network/native failures.
const source = ts.createSourceFile('upcoming.tsx', readFileSync(new URL('../apps/mobile/app/(tabs)/upcoming.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let options;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'remove') options = node.initializer.arguments[0];
  ts.forEachChild(node, visit);
}
visit(source);
assert(options, 'Upcoming deletion mutation must exist');
const code = ts.transpileModule(`exports.options = ${ts.createPrinter().printNode(ts.EmitHint.Expression, options, source)};`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function fixture({ cancellationFails = false } = {}) {
  let currentUser = 'alex'; let scheduled = true;
  let resolve, reject;
  const server = new Promise((yes, no) => { resolve = yes; reject = no; });
  const alerts = [], refreshed = [], paths = [];
  const exports = {};
  vm.runInNewContext(code, {
    exports, userId: 'alex', Error,
    useAuthStore: { getState: () => ({ userId: currentUser }) },
    api: { delete: path => { paths.push(path); return server; } },
    cancelObligationReminder: async (user, id) => {
      assert.equal(user, 'alex'); assert.equal(id, 'synthetic-bill');
      if (cancellationFails) throw new Error('Native notification store unavailable');
      scheduled = false;
    },
    Alert: { alert: (...args) => alerts.push(args) },
    qc: { invalidateQueries: ({ queryKey }) => refreshed.push(queryKey[0]) },
  });
  return { options: exports.options, alerts, refreshed, paths, resolve, reject, scheduled: () => scheduled, switchUser: () => { currentUser = 'sam'; } };
}
const item = { id: 'synthetic-bill' };

test('pending and failed server deletion preserve the saved bill reminder', async () => {
  const f = fixture(); const pending = f.options.mutationFn(item);
  await Promise.resolve(); assert.equal(f.scheduled(), true);
  f.reject(new Error('Connection lost'));
  await assert.rejects(pending, /Connection lost/);
  assert.equal(f.scheduled(), true);
  assert.deepEqual(f.paths, ['/upcoming/synthetic-bill']);
});

test('confirmed deletion cancels its reminder and refreshes the saved views', async () => {
  const f = fixture(); const pending = f.options.mutationFn(item);
  f.resolve(); await pending; f.options.onSuccess();
  assert.equal(f.scheduled(), false);
  assert.deepEqual(f.refreshed, ['upcoming', 'dashboard']);
  assert.equal(f.alerts.length, 0);
});

test('native cleanup failure does not misreport a successful server deletion as failed', async () => {
  const f = fixture({ cancellationFails: true }); const pending = f.options.mutationFn(item);
  f.resolve(); await pending; f.options.onSuccess();
  assert.equal(f.scheduled(), true);
  assert.equal(f.alerts[0][0], 'Item deleted');
  assert.match(f.alerts[0][1], /reminder could not be removed/);
  assert.deepEqual(f.refreshed, ['upcoming', 'dashboard']);
});

test('late deletion results do not report the old login errors or refresh another login', async () => {
  const f = fixture({ cancellationFails: true }); const pending = f.options.mutationFn(item);
  f.switchUser(); f.resolve(); await pending; f.options.onSuccess(); f.options.onError(new Error('Private old error'));
  assert.equal(f.alerts.length, 0); assert.deepEqual(f.refreshed, []);
});

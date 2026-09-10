import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture(manage) {
  const hooks = []; let index = 0; const cleanups = []; const timers = new Map(); let timer = 0;
  const calls = []; let callbacks; const scripts = [];
  const window = { setTimeout: fn => { timers.set(++timer, fn); return timer; }, clearTimeout: id => timers.delete(id), Plaid: { create: options => { callbacks = options; return { open: () => calls.push('open'), destroy: () => calls.push('destroy') }; } } };
  const adapters = {
    react: {
      useRef: initial => { const i = index++; return hooks[i] ??= { current: initial }; },
      useState: initial => { const i = index++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], value => { hooks[i] = value; }]; },
      useEffect: fn => { const i = index++; if (!(i in hooks)) { hooks[i] = true; cleanups.push(fn()); } },
    },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  };
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../apps/desktop/components/plaid-link-button.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, window, clearTimeout: window.clearTimeout, document: { createElement: () => ({ remove() {} }), head: { appendChild: script => scripts.push(script) } }, require: name => { assert(name in adapters, name); return adapters[name]; } });
  const render = () => { index = 0; return exports.PlaidLinkButton({ onManage: manage }); };
  const children = () => render().props.children;
  return { children, calls, timers, get callbacks() { return callbacks; }, load: () => scripts.at(-1).onload(), unmount: () => cleanups.forEach(fn => fn?.()) };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('blank Link times out, destroys its frame, and ignores late success', async () => {
  const paths = [];
  const f = fixture(async request => { paths.push(request.path); return { linkToken: 'synthetic-link' }; });
  f.children()[0].props.onClick(); await tick(); f.load(); await tick();
  assert.deepEqual(f.calls, ['open']);
  [...f.timers.values()][0]();
  assert.equal(f.children()[0].props.disabled, false);
  assert.match(f.children()[2].props.children, /did not open/);
  f.callbacks.onSuccess('late-token', {}); await tick();
  assert.deepEqual(paths, ['/link-token']);
  assert(f.calls.includes('destroy'));
});
test('cancel while token loads prevents a later response from opening Link', async () => {
  let resolve; const f = fixture(() => new Promise(r => { resolve = r; }));
  f.children()[0].props.onClick();
  f.children()[1].props.onClick(); resolve({ linkToken: 'late' }); await tick();
  assert.equal(f.children()[0].props.disabled, false);
  assert.equal(f.timers.size, 0);
  assert.deepEqual(f.calls, []);
});
test('visible Link has no loading deadline and saves only once', async () => {
  const paths = []; const f = fixture(async request => { paths.push(request.path); return { linkToken: 'synthetic' }; });
  f.children()[0].props.onClick(); await tick(); f.load(); await tick();
  f.callbacks.onEvent('OPEN'); assert.equal(f.timers.size, 0);
  f.callbacks.onSuccess('public-test', {}); f.callbacks.onSuccess('public-test', {}); await tick();
  assert.deepEqual(paths, ['/link-token', '/exchange']);
  assert.equal(f.children()[0].props.disabled, false);
  assert.match(f.children()[2].props.children, /Connection saved/);
});
test('unmount removes loading timers and rejects stale callbacks', async () => {
  const paths = []; const f = fixture(async request => { paths.push(request.path); return { linkToken: 'synthetic' }; });
  f.children()[0].props.onClick(); await tick(); f.load(); await tick();
  f.unmount(); f.callbacks.onSuccess('late-token', {}); await tick();
  assert.equal(f.timers.size, 0); assert.deepEqual(paths, ['/link-token']);
});

test('failed bank mutation refreshes persisted connection status before reporting its error', async () => {
  const source = ts.createSourceFile('workspace-page.tsx', readFileSync(new URL('../apps/desktop/components/workspace-page.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'managePlaid') callback = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(source); assert(callback, 'Workspace bank mutation callback must exist');
  const body = ts.createPrinter().printNode(ts.EmitHint.Expression, callback, source);
  const code = ts.transpileModule(`exports.manage = ${body}`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const events = []; const exports = {};
  vm.runInNewContext(code, {
    exports, fetch: async () => ({ status: 400, ok: false, json: async () => ({ error: 'Needs reconnect' }) }),
    envelopeData: () => null, errorMessage: payload => payload.error,
    loadWorkspace: async () => { events.push('refreshed'); },
    router: { replace() { assert.fail('must not sign out on a bank error'); }, refresh() {} }, view: 'accounts',
  });
  await assert.rejects(exports.manage({ path: '/sync', body: { plaidItemId: 'synthetic' } }), /Needs reconnect/);
  assert.deepEqual(events, ['refreshed']);
});

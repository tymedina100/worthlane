import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import ts from 'typescript';

function fixture(manage, props = {}, saved = null) {
  const storage = new Map(saved ? [["worthlane.plaid.oauth.v1", JSON.stringify(saved)]] : []);
  const hooks = []; let index = 0; const cleanups = []; const timers = new Map(); let timer = 0;
  const calls = []; let callbacks; const scripts = [];
  const window = { sessionStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) }, location: { href: "https://worthlane.example/dashboard/plaid-return?oauth_state_id=test-state" }, setTimeout: fn => { timers.set(++timer, fn); return timer; }, clearTimeout: id => timers.delete(id), Plaid: { create: options => { callbacks = options; return { open: () => calls.push('open'), destroy: () => calls.push('destroy') }; } } };
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
  vm.runInNewContext(code, { exports, window, URL, Error, clearTimeout: window.clearTimeout, document: { createElement: () => ({ remove() {} }), head: { appendChild: script => scripts.push(script) } }, require: name => { assert(name in adapters, name); return adapters[name]; } });
  const render = () => { index = 0; return exports.PlaidLinkButton({ onManage: manage, ...props }); };
  const children = () => render().props.children;
  return { storage, children, calls, timers, get callbacks() { return callbacks; }, load: () => scripts.at(-1).onload(), unmount: () => cleanups.forEach(fn => fn?.()) };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('blank Link times out, destroys its frame, and ignores late success', async () => {
  const paths = [];
  const f = fixture(async request => { paths.push(request.path); return { linkToken: 'synthetic-link', oauthSession: 'session' }; });
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
  const paths = []; const f = fixture(async request => { paths.push(request.path); return { linkToken: 'synthetic', oauthSession: 'session' }; });
  f.children()[0].props.onClick(); await tick(); f.load(); await tick();
  f.callbacks.onEvent('OPEN'); assert.equal(f.timers.size, 0);
  f.callbacks.onSuccess('public-test', {}); f.callbacks.onSuccess('public-test', {}); await tick();
  assert.deepEqual(paths, ['/link-token', '/oauth-session', '/exchange']);
  assert.equal(f.children()[0].props.disabled, false);
  assert.match(f.children()[2].props.children, /Connection saved/);
});
test('unmount removes loading timers and rejects stale callbacks', async () => {
  const paths = []; const f = fixture(async request => { paths.push(request.path); return { linkToken: 'synthetic', oauthSession: 'session' }; });
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

const pending = (extra = {}) => ({ linkToken: 'original-link', oauthSession: 'original-login', includeLiabilities: false, expiresAt: Date.now() + 60000, ...extra });
test('OAuth return reuses original token and full return URI without creating a new token', async () => {
  const paths = []; const f = fixture(async request => { paths.push(request.path); return { valid: true }; }, { resume: true }, pending());
  f.children(); await tick(); f.load(); await tick();
  assert.equal(f.callbacks.token, 'original-link');
  assert.equal(f.callbacks.receivedRedirectUri, 'https://worthlane.example/dashboard/plaid-return?oauth_state_id=test-state');
  f.callbacks.onSuccess('public-return', {}); await tick();
  assert.deepEqual(paths, ['/oauth-session', '/oauth-session', '/exchange']);
  assert.equal(f.storage.size, 0);
});
test('expired return clears saved state and does not load Link or call API', async () => {
  const f = fixture(async () => assert.fail('expired session'), { resume: true }, pending({ expiresAt: 1 }));
  f.children(); await tick();
  assert.match(f.children()[2].props.children, /expired/); assert.equal(f.storage.size, 0); assert.deepEqual(f.calls, []);
});
test('different sign-in is rejected before OAuth resume', async () => {
  const f = fixture(async () => { throw new Error('Previous sign-in expired'); }, { resume: true }, pending());
  f.children(); await tick();
  assert.match(f.children()[2].props.children, /Previous sign-in/); assert.deepEqual(f.calls, []); assert.equal(f.storage.size, 0);
});
test('reconnect return preserves Item and debt consent and never exchanges a public token', async () => {
  const requests = []; const f = fixture(async request => { requests.push(request); return { valid: true }; }, { resume: true }, pending({ itemId: 'owned-item', includeLiabilities: true }));
  f.children(); await tick(); f.load(); await tick(); f.callbacks.onSuccess(null, {}); await tick();
  assert.equal(requests.at(-1).path, '/sync');
  assert.equal(requests.at(-1).body.plaidItemId, 'owned-item');
  assert.equal(requests.at(-1).body.oauthSession, 'original-login');
  assert.equal(requests.at(-1).body.refresh, false);
  assert.match(f.children()[2].props.children, /Check debt details/);
});

function proxyFixture() {
  const owner = createHash('sha256').update('owner').digest('hex');
  const original = `original-login.${owner}`;
  const fresh = `new-login-boundary.${owner}`;
  const jar = new Map([['oauth', original], ['access', `header.${Buffer.from(JSON.stringify({sub:'owner'})).toString('base64url')}.signature`]]);
  const forwarded = [];
  const adapters = {
    'next/headers': { cookies: async () => ({ get: key => ({ value: jar.get(key) }), set: (key, value) => jar.set(key, value) }) },
    'node:crypto': { createHash, randomUUID: () => 'new-login-boundary' },
    '@/src/lib/session-cookies': { ACCESS_TOKEN_COOKIE: 'access', REFRESH_TOKEN_COOKIE: 'refresh', PLAID_OAUTH_COOKIE: 'oauth' },
    '@/src/lib/server-api': {
      sameOriginMutationError: () => null,
      errorResponse: (message, status, code) => ({ status, error: { message, code } }),
      jsonResponse: (data, status = 200) => ({ status, data }),
      readJson: async response => response.payload,
      upstreamUnavailableResponse: () => ({ status: 502 }),
      authenticatedServerRequest: async (_cookies, path, options) => { forwarded.push({ path, body: JSON.parse(options.body) }); return { ok: true, status: 200, payload: { data: { linkToken: 'provider-link' } } }; },
    },
  };
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../apps/desktop/app/api/plaid/[...segments]/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Buffer, require: name => { assert(name in adapters, name); return adapters[name]; } });
  return { jar, forwarded, original, fresh, post: (segment, body) => exports.POST({ json: async () => body }, { params: Promise.resolve({ segments: [segment] }) }) };
}
test('server rejects stale login boundaries at exchange and update mutation, not just resume', async () => {
  const f = proxyFixture();
  for (const [path, body] of [['oauth-session', {}], ['exchange', { publicToken: 'synthetic' }], ['sync', { plaidItemId: 'owned' }]]) {
    assert.equal((await f.post(path, { ...body, oauthSession: 'previous-login' })).status, 409);
  }
  assert.equal(f.forwarded.length, 0);
  assert.equal((await f.post('exchange', { publicToken: 'synthetic' })).status, 409);
  assert.equal((await f.post('exchange', { publicToken: 'synthetic', oauthSession: f.original })).status, 200);
  assert.equal(f.forwarded.length, 1);
  assert.equal(f.forwarded[0].body.publicToken, 'synthetic');
  assert.equal('oauthSession' in f.forwarded[0].body, false);
});
test('server generates a fresh boundary only after successful Link token response', async () => {
  const f = proxyFixture();
  const result = await f.post('link-token', { platform: 'web', mode: 'create' });
  assert.equal(result.data.data.oauthSession, f.fresh);
  assert.equal(f.jar.get('oauth'), f.fresh);
  assert.equal((await f.post('oauth-session', { oauthSession: f.original })).status, 409);
  assert.equal((await f.post('oauth-session', { oauthSession: f.fresh })).status, 200);
  f.jar.delete('access');
  assert.equal((await f.post('oauth-session', { oauthSession: f.fresh })).status, 409);
});

test('late Link response cannot transfer an old session cookie to a different account', async () => {
  const f = proxyFixture();
  f.jar.set('access', `header.${Buffer.from(JSON.stringify({sub:'different-owner'})).toString('base64url')}.signature`);
  assert.equal((await f.post('exchange', { oauthSession: f.original, publicToken: 'synthetic' })).status, 409);
  assert.equal(f.forwarded.length, 0);
});

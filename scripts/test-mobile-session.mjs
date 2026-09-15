import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture(refreshStatus) {
  const storage = new Map([['accessToken', 'expired-access'], ['refreshToken', 'synthetic-refresh']]);
  const calls = []; let expired = 0;
  const response = (status, data) => ({ status, ok: status < 400, json: async () => data });
  const fetch = async (url, options) => {
    calls.push(url);
    if (url.endsWith('/auth/login')) return response(401, { error: { message: 'Invalid credentials' } });
    if (url.endsWith('/auth/refresh')) {
      await new Promise(resolve => setTimeout(resolve, 5));
      return response(refreshStatus, { data: { accessToken: 'renewed-access', refreshToken: 'renewed-refresh' } });
    }
    return options.headers.Authorization === 'Bearer renewed-access'
      ? response(200, { data: { persisted: true } }) : response(401, {});
  };
  const adapters = {
    'expo-secure-store': { getItemAsync: async key => storage.get(key) ?? null, setItemAsync: async (key, value) => storage.set(key, value) },
    'expo/fetch': { fetch },
  };
  const code = ts.transpileModule(readFileSync(new URL('../apps/mobile/src/lib/api.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, process: { env: { EXPO_PUBLIC_API_URL: 'http://localhost:3301/api' } }, fetch, require: name => { assert(name in adapters); return adapters[name]; } });
  exports.setSessionExpiredHandler(async () => { expired++; storage.clear(); });
  return { ...exports, storage, calls, expired: () => expired };
}

test('concurrent expired requests share a single refresh and retry with the renewed session', async () => {
  const f = fixture(200);
  const results = await Promise.all([f.api.get('/dashboard'), f.api.get('/accounts')]);
  assert(results.every(result => result.persisted));
  assert.equal(f.calls.filter(url => url.endsWith('/auth/refresh')).length, 1);
  assert.equal(f.storage.get('refreshToken'), 'renewed-refresh');
  assert.equal(f.expired(), 0);
});

test('a revoked session ends the local login once for concurrent requests', async () => {
  const f = fixture(401);
  const results = await Promise.allSettled([f.api.get('/dashboard'), f.api.get('/accounts')]);
  assert(results.every(result => result.status === 'rejected' && result.reason.status === 401));
  assert.equal(f.expired(), 1);
  assert.equal(f.storage.size, 0);
});

test('a temporary refresh failure preserves credentials for retry', async () => {
  const f = fixture(503);
  await assert.rejects(f.api.get('/dashboard'), error => error.status === 503);
  assert.equal(f.expired(), 0);
  assert.equal(f.storage.get('refreshToken'), 'synthetic-refresh');
});

test('incorrect sign-in credentials do not trigger refresh or clear another session', async () => {
  const f = fixture(401);
  await assert.rejects(f.api.post('/auth/login', {}), error => error.message === 'Invalid credentials');
  assert.equal(f.calls.length, 1);
  assert.equal(f.expired(), 0);
});

test('missing refresh credentials clear a stale local login', async () => {
  const f = fixture(401);
  f.storage.delete('refreshToken');
  await assert.rejects(f.api.get('/dashboard'), error => error.status === 401);
  assert.equal(f.expired(), 1);
  assert.equal(f.calls.filter(url => url.endsWith('/auth/refresh')).length, 0);
});

test('an old successful refresh cannot overwrite a newer login', async () => {
  const f = fixture(200);
  const request = f.api.get('/dashboard');
  await new Promise(resolve => setTimeout(resolve, 1));
  f.storage.set('refreshToken', 'new-login-refresh');
  f.storage.set('accessToken', 'renewed-access');
  await assert.rejects(request, error => error.status === 401);
  assert.equal(f.storage.get('refreshToken'), 'new-login-refresh');
  assert.equal(f.expired(), 0);
  assert.equal(f.calls.filter(url => url.endsWith('/dashboard')).length, 1);
});

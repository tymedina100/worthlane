import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real store with native/network adapters replaced. This verifies
// that optional telemetry failures cannot retain a signed-in session.
function fixture() {
  const storage = new Map([['accessToken', 'test-access'], ['refreshToken', 'test-refresh'], ['userId', 'test-user'], ['userEmail', 'synthetic@worthlane.local']]);
  const calls = []; let state; let expireSession;
  const adapters = {
    zustand: { create: factory => { state = factory(update => Object.assign(state, update)); state.getState = () => state; return state; } },
    'expo-secure-store': { getItemAsync: async key => storage.get(key), setItemAsync: async (key, value) => storage.set(key, value), deleteItemAsync: async key => storage.delete(key) },
    'expo-local-authentication': { authenticateAsync: async () => ({ success: true }) },
    'expo-notifications': {},
    'react-native': { Platform: { OS: 'ios' } },
    '@/lib/api': { setSessionExpiredHandler: handler => { expireSession = handler; }, api: { post: async path => {
      calls.push(['request', path]);
      if (path === '/auth/logout') throw new Error('Synthetic offline network');
      return { user: { id: 'test-user', email: 'synthetic@worthlane.local' }, accessToken: 'test-access', refreshToken: 'test-refresh' };
    } } },
    '@/lib/posthog': { isPostHogEnabled: true, posthog: {
      identify: (...args) => { calls.push(['identify', ...args]); throw new Error('Synthetic telemetry failure'); },
      capture: () => { calls.push(['capture']); throw new Error('Synthetic telemetry failure'); },
      reset: () => { calls.push(['reset']); throw new Error('Synthetic telemetry failure'); },
      flush: () => { throw new Error('Logout must not flush analytics'); },
    } },
    '@/lib/query-client': { clearPrivateQueryCache: async () => calls.push(['clear-cache']) },
    '@/lib/obligation-reminders': { setReminderSession: async id => calls.push(['reminder-session', id]) },
  };
  const code = ts.transpileModule(readFileSync(new URL('../apps/mobile/src/store/auth.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => { assert(name in adapters, `Unexpected dependency: ${name}`); return adapters[name]; } });
  return { state: exports.useAuthStore, storage, calls, expireSession };
}

test('hydrate, login and biometric sign-in survive telemetry errors without email enrichment', async () => {
  const { state, calls } = fixture();
  await state.hydrate();
  assert.equal(state.isLoading, false);
  await state.login('synthetic@worthlane.local', 'test-password');
  await state.loginWithBiometric();
  assert.equal(state.userId, 'test-user');
  const identities = calls.filter(call => call[0] === 'identify');
  assert.equal(identities.length, 3);
  for (const call of identities) assert.equal(JSON.stringify(call), JSON.stringify(['identify', 'test-user']));
});

test('rejected refresh clears the local identity, private cache and reminders without a network logout', async () => {
  const { state, storage, calls, expireSession } = fixture();
  await state.hydrate();
  await expireSession();
  assert.equal(state.userId, null);
  assert.equal(state.email, null);
  for (const key of ['accessToken', 'refreshToken', 'userId', 'userEmail']) assert.equal(storage.has(key), false);
  assert(calls.some(call => call[0] === 'clear-cache'));
  assert(calls.some(call => call[0] === 'reminder-session' && call[1] === null));
  assert.equal(calls.filter(call => call[0] === 'request').length, 0);
});

test('offline logout with failing analytics clears credentials, cached data and reminders', async () => {
  const { state, storage, calls } = fixture();
  await state.hydrate();
  await state.logout();
  assert.equal(state.userId, null);
  assert.equal(state.email, null);
  for (const key of ['accessToken', 'refreshToken', 'userId', 'userEmail']) assert.equal(storage.has(key), false);
  assert(calls.some(call => call[0] === 'clear-cache'));
  assert(calls.some(call => call[0] === 'reminder-session' && call[1] === null));
  assert(calls.some(call => call[0] === 'reset'));
});

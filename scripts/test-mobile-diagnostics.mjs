import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file, adapters = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, process: { env: {} }, require: name => { assert(name in adapters, name); return adapters[name]; }, ...globals });
  return exports;
}
const privacy = load('../apps/mobile/src/lib/diagnostic-privacy.ts');
test('mobile error filter strips private context while retaining bundle positions', () => {
  const secret = 'PRIVATE-FINANCIAL-DATA';
  const event = { event_id: 'synthetic', release: 'release', dist: '1', timestamp: 100,
    user: { email: secret }, message: secret, request: { url: secret, headers: { Authorization: secret } },
    extra: { balance: secret }, contexts: { app: { account: secret } }, breadcrumbs: [{ message: secret }],
    exception: { values: [{ type: secret, value: secret, stacktrace: { frames: [
      { filename: '/private/device/main.jsbundle', lineno: 42, colno: 12, vars: { token: secret }, context_line: secret },
      { filename: `https://bank.example/${secret}` },
      { filename: `app:///index.bundle?token=${secret}` },
    ] } }] },
  };
  const result = privacy.privateMobileDiagnosticEvent(event);
  assert(!JSON.stringify(result).includes(secret));
  assert.equal(JSON.stringify(result.exception.values[0].stacktrace.frames), JSON.stringify([
    { filename: 'app:///main.jsbundle', lineno: 42, colno: 12, in_app: true },
  ]));
  assert.equal(event.message, secret);
});
for (const configured of [true, false]) test(`mobile SDK initializes safely with diagnostics ${configured ? 'enabled' : 'disabled'}`, () => {
  const calls = [];
  load('../apps/mobile/src/lib/sentry.ts', {
    'expo-constants': { default: { expoConfig: { extra: { sentry: { dsn: configured ? 'https://synthetic.example' : 123, environment: 456 } } } } },
    '@sentry/react-native': { init: options => calls.push(options) },
    './diagnostic-privacy': privacy,
  });
  assert.equal(calls.length, 1);
  const options = calls[0];
  assert.equal(options.enabled, configured);
  assert.equal(options.sendDefaultPii, false);
  assert.equal(options.enableNative, false);
  assert.equal(options.enableAutoSessionTracking, false);
  assert.equal(options.release, "worthlane-mobile@unknown");
  assert.equal(options.tracesSampleRate, 0);
  assert.equal(options.attachScreenshot, false);
  assert.equal(options.attachViewHierarchy, false);
  assert.equal(options.beforeSendTransaction({ request: { data: 'private' } }), null);
  assert(!JSON.stringify(options.beforeSend({ message: 'PRIVATE', extra: { value: 'PRIVATE' } })).includes('PRIVATE'));
});


test('Plaid local diagnostics retain only fixed event vocabulary', () => {
  const calls = [];
  const { tracePlaidDevelopmentEvent } = load('../apps/mobile/src/lib/plaid-development-diagnostics.ts', {}, {
    __DEV__: true, console: { info: (...args) => calls.push(args) },
  });
  const secret = 'PRIVATE-FINANCIAL-DATA';
  tracePlaidDevelopmentEvent({ eventName: 'FAIL_OAUTH', metadata: {
    viewName: 'OAUTH', errorCode: 'INVALID_CREDENTIALS', errorMessage: secret,
    accountNumberMask: secret, institutionName: secret, institutionSearchQuery: secret,
    linkSessionId: secret, requestId: secret, metadataJson: secret, selection: secret,
  } });
  assert.equal(calls.length, 1);
  assert(!JSON.stringify(calls).includes(secret));
  assert.equal(calls[0][1].eventName, 'FAIL_OAUTH');
  assert.equal(calls[0][1].viewName, 'OAUTH');
  assert.equal(calls[0][1].errorCode, 'INVALID_CREDENTIALS');
  tracePlaidDevelopmentEvent({ eventName: secret, metadata: { viewName: secret, errorCode: secret } });
  assert(!JSON.stringify(calls).includes(secret));
  assert.equal(calls[1][1].eventName, 'OTHER');
  tracePlaidDevelopmentEvent({ eventName: 'ERROR', metadata: { errorCode: 'INCORRECT_OAUTH_NONCE' } });
  assert.equal(calls[2][1].errorCode, 'INCORRECT_OAUTH_NONCE');
  // The observed repair failure must remain distinguishable from unknown errors,
  // without retaining the provider's raw session identifiers or free text.
  tracePlaidDevelopmentEvent({ eventName: 'FAIL_OAUTH', metadata: {
    errorCode: 'REQUIRES_OAUTH', errorMessage: secret, linkSessionId: secret,
    requestId: secret, metadataJson: secret,
  } });
  assert.equal(calls[3][1].errorCode, 'REQUIRES_OAUTH');
  assert.equal(calls[3][1].hasError, true);
  assert(!JSON.stringify(calls).includes(secret));
});

test('Plaid diagnostics do not inspect events or log in release builds', () => {
  const { tracePlaidDevelopmentEvent } = load('../apps/mobile/src/lib/plaid-development-diagnostics.ts', {}, {
    __DEV__: false, console: { info: () => assert.fail('release logging') },
  });
  tracePlaidDevelopmentEvent({ get metadata() { assert.fail('release metadata access'); } });
});

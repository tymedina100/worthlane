import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../apps/mobile/app.config.js', import.meta.url), 'utf8');
const base = JSON.parse(fs.readFileSync(new URL('../apps/mobile/app.json', import.meta.url), 'utf8'));
function config(env) {
  const context = { module: { exports: {} }, process: { env }, URL,
    require: name => { assert.equal(name, './app.json'); return base; } };
  vm.runInNewContext(source, context);
  return context.module.exports();
}

test('release profiles reject development, malformed and credential-bearing API URLs', () => {
  for (const profile of ['preview', 'production']) {
    for (const url of ['', 'not-a-url', 'http://api.worthlane.app/api',
      'https://localhost/api', 'https://127.0.0.1/api', 'https://10.0.2.2/api',
      'https://192.168.1.4/api', 'https://[::1]/api', 'https://worthlane.local/api',
      'https://dev.localhost/api', 'https://user:password@api.worthlane.app/api',
      'https://api.worthlane.app/api?token=secret', 'https://api.worthlane.app/api#local']) {
      assert.throws(() => config({ EAS_BUILD_PROFILE: profile, EXPO_PUBLIC_API_URL: url }),
        /EXPO_PUBLIC_API_URL/, `${profile}: ${url}`);
    }
  }
});

test('release banking requires associated domain and explicit Apple identity', () => {
  const env = { EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_API_URL: 'https://api.worthlane.app/api',
    EXPO_PUBLIC_PLAID_ENABLED: 'true' };
  assert.throws(() => config(env), /PLAID_IOS_ASSOCIATED_DOMAIN/);
  assert.throws(() => config({ ...env, PLAID_IOS_ASSOCIATED_DOMAIN: 'worthlane.app' }), /APPLE_TEAM_ID/);
  const result = config({ ...env, PLAID_IOS_ASSOCIATED_DOMAIN: 'worthlane.app', APPLE_TEAM_ID: '5FBXR5M5PJ' });
  assert.equal(result.ios.bundleIdentifier, 'com.worthlane.mobile');
  assert.equal(result.android.package, 'com.worthlane.mobile');
  assert.ok(result.ios.associatedDomains.includes('applinks:worthlane.app'));
});

test('local development still accepts emulator API routing', () => {
  assert.equal(config({ EXPO_PUBLIC_API_URL: 'http://10.0.2.2:3301/api' }).name, 'Worthlane');
});

const eas = JSON.parse(fs.readFileSync(new URL('../apps/mobile/eas.json', import.meta.url), 'utf8'));
test('internal Sandbox candidate resolves banking identity without production services', () => {
  const profile = eas.build['sandbox-preview'];
  assert.equal(profile.extends, 'preview');
  assert.equal(eas.build.preview.distribution, 'internal');
  assert.equal(eas.submit['sandbox-preview'], undefined);
  const result = config({ ...profile.env, EAS_BUILD_PROFILE: 'sandbox-preview' });
  assert.ok(result.ios.associatedDomains.includes('applinks:worthlane.app'));
  assert.equal(result.ios.appleTeamId, '5FBXR5M5PJ');
  assert.equal(result.extra.sentry.dsn, null);
  assert(Object.values(profile.env).every(value => typeof value === 'string' && value.length > 0), 'EAS rejects empty environment values');
  assert(!result.plugins.some(p => Array.isArray(p) && p[0] === '@sentry/react-native/expo'));
});
test('Sandbox candidate fails closed on inherited production settings', () => {
  const env = { ...eas.build['sandbox-preview'].env, EAS_BUILD_PROFILE: 'sandbox-preview' };
  for (const [name, value] of Object.entries({
    SENTRY_DISABLE_AUTO_UPLOAD: 'false', EXPO_NO_DOTENV: '0', EXPO_PUBLIC_API_URL: 'https://production.example/api',
    EXPO_PUBLIC_PLAID_ENABLED: 'false', PLAID_IOS_ASSOCIATED_DOMAIN: 'wrong.example',
    APPLE_TEAM_ID: 'AAAAAAAAAA', EXPO_PUBLIC_ENABLE_AI: 'true', EXPO_PUBLIC_ENABLE_PAYWALL: 'true',
    EXPO_PUBLIC_POSTHOG_KEY: 'synthetic', EXPO_PUBLIC_SENTRY_DSN: 'synthetic',
    SENTRY_ORG: 'synthetic', SENTRY_PROJECT: 'synthetic', SENTRY_AUTH_TOKEN: 'synthetic',
  })) {
    for (const profile of ['sandbox-preview', 'sandbox-simulator']) {
      assert.throws(() => config({ ...env, EAS_BUILD_PROFILE: profile, [name]: value }), new RegExp(name));
    }
  }
});

test('laptop Simulator candidate inherits guarded internal settings without a development client', () => {
  const profile = eas.build['sandbox-simulator'];
  assert.equal(profile.extends, 'sandbox-preview');
  assert.equal(profile.ios.simulator, true);
  assert.equal(eas.build.preview.developmentClient, undefined);
  assert.equal(eas.submit['sandbox-simulator'], undefined);
  const result = config({ ...eas.build['sandbox-preview'].env, EAS_BUILD_PROFILE: 'sandbox-simulator' });
  assert.equal(result.ios.bundleIdentifier, 'com.worthlane.mobile');
  assert.equal(result.extra.sentry.dsn, null);
});

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

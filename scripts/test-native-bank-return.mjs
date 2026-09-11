import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../apps/mobile/app/+native-intent.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(code, { exports, URL });

test('bank returns open protected Settings without putting OAuth parameters in navigation', () => {
  for (const initial of [true, false]) {
    for (const path of [
      'https://worthlane.app/plaid-oauth?oauth_state_id=synthetic-state#private-fragment',
      '/plaid-oauth?oauth_state_id=synthetic-state',
      'worthlane://plaid-oauth?oauth_state_id=synthetic-state',
      'worthlane:///plaid-oauth?oauth_state_id=synthetic-state',
    ]) assert.equal(exports.redirectSystemPath({ path, initial }), '/(tabs)/profile');
  }
});

test('unrelated links and malformed input keep their normal router behavior', () => {
  for (const path of [
    '/household?invitation=synthetic-invite',
    'worthlane://onboarding',
    'https://other.example/plaid-oauth',
    'https://worthlane.app/plaid-oauth/other',
    'https://worthlane.app.evil.example/plaid-oauth',
    'https://[invalid',
  ]) assert.equal(exports.redirectSystemPath({ path, initial: false }), path);
});

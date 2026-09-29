import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const helper = pathToFileURL(resolve('scripts/lib/sandbox-credentials.mjs')).href;
function check(files, overrides, expected) {
  const directory = mkdtempSync(join(tmpdir(), 'worthlane-env-test-'));
  try {
    for (const [name, value] of Object.entries(files)) writeFileSync(join(directory, name), value);
    // Fresh process avoids Next's environment cache; no real credentials or network.
    const env = { PATH: process.env.PATH, NODE_ENV: 'development', ...overrides };
    const code = `import {loadSandboxCredentials} from ${JSON.stringify(helper)};\n` +
      `import assert from 'node:assert/strict';\n` +
      (typeof expected === 'string'
        ? `assert.throws(()=>loadSandboxCredentials(${JSON.stringify(directory)}), {message:${JSON.stringify(expected)}});`
        : `assert.deepEqual(loadSandboxCredentials(${JSON.stringify(directory)}), ${JSON.stringify(expected)});`);
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
const base = 'PLAID_ENV=sandbox\nPLAID_CLIENT_ID=synthetic-client\nPLAID_SECRET=synthetic-base\n';
test('documented .env works without .env.local', () => check({'.env':base}, {}, {PLAID_CLIENT_ID:'synthetic-client', PLAID_SECRET:'synthetic-base'}));
test('.env.local overrides base; shell wins over files', () => {
  check({'.env':base, '.env.local':'PLAID_SECRET=synthetic-local\n'}, {}, {PLAID_CLIENT_ID:'synthetic-client',PLAID_SECRET:'synthetic-local'});
  check({'.env':base, '.env.local':'PLAID_SECRET=synthetic-local\n'}, {PLAID_SECRET:'synthetic-shell'}, {PLAID_CLIENT_ID:'synthetic-client',PLAID_SECRET:'synthetic-shell'});
});
test('reject production and missing credentials without revealing values', () => {
  check({'.env':base}, {PLAID_ENV:'production'}, 'Plaid environment must be sandbox');
  check({'.env':'PLAID_ENV=sandbox\n'}, {}, 'Plaid Sandbox client ID is required');
  check({'.env':'PLAID_ENV=sandbox\nPLAID_CLIENT_ID=synthetic\n'}, {}, 'Plaid Sandbox secret is required');
});

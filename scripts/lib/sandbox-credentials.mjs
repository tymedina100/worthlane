import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

export function loadSandboxCredentials(directory = resolve('apps/api')) {
  const apiRequire = createRequire(resolve('apps/api/package.json'));
  const { loadEnvConfig } = createRequire(apiRequire.resolve('next/package.json'))('@next/env');
  loadEnvConfig(directory);
  // Do not include supplied values in errors or return unrelated API secrets.
  assert(process.env.PLAID_ENV === 'sandbox', 'Plaid environment must be sandbox');
  assert(process.env.PLAID_CLIENT_ID?.trim(), 'Plaid Sandbox client ID is required');
  assert(process.env.PLAID_SECRET?.trim(), 'Plaid Sandbox secret is required');
  return { PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID, PLAID_SECRET: process.env.PLAID_SECRET };
}

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const database = new URL(process.env.WORTHLANE_TEST_DATABASE_URL ?? 'http://invalid');
assert(database.protocol === 'postgresql:' && database.hostname === '127.0.0.1' && database.pathname === '/worthlane_beta_test' && database.port,
  'Use the isolated localhost worthlane_beta_test database.');
const origin = process.env.WORTHLANE_TEST_DESKTOP_ORIGIN ?? 'http://localhost:3402';
assert(/^http:\/\/localhost:\d+$/.test(origin), 'Only a local desktop origin is permitted.');
const apiRequire = createRequire(resolve('apps/api/package.json'));
const dbRequire = createRequire(resolve('packages/db/package.json'));
const { PrismaClient } = dbRequire('@prisma/client');
const bcrypt = apiRequire('bcryptjs');
const prisma = new PrismaClient({ datasources: { db: { url: database.href } } });
let user;
async function post(path, body, requestOrigin = origin) {
  return fetch(`${origin}/api/auth/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: requestOrigin },
    body: JSON.stringify(body), signal: AbortSignal.timeout(25_000),
  });
}
try {
  const email = `web-recovery-${randomUUID()}@worthlane.local`;
  const oldPassword = `Synthetic-old-${randomUUID()}`;
  const newPassword = `Synthetic-new-${randomUUID()}`;
  user = await prisma.user.create({ data: { email, passwordHash: await bcrypt.hash(oldPassword, 12) } });
  const token = randomUUID().toUpperCase();
  await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60_000) } });
  assert.equal((await post('reset-password', { token, newPassword }, 'https://untrusted.example')).status, 403);
  assert.equal((await post('reset-password', { token: 'NOT-A-VALID-CODE', newPassword })).status, 400);
  assert.equal((await post('reset-password', { token, newPassword: 'short' })).status, 400);
  const result = await post('reset-password', { token: token.toLowerCase(), newPassword });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.match(result.headers.get('set-cookie') ?? '', /Max-Age=0/);
  assert.equal((await post('reset-password', { token, newPassword: oldPassword })).status, 400);
  assert.equal((await post('login', { email, password: oldPassword })).status, 401);
  const login = await post('login', { email, password: newPassword });
  assert.equal(login.status, 200);
  const loginBody = await login.json();
  assert.equal(loginBody.data.user.id, user.id);
  assert.equal(loginBody.data.accessToken, undefined);
  assert.equal(loginBody.data.refreshToken, undefined);
  await prisma.$disconnect();
  assert.equal(await bcrypt.compare(newPassword, (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash), true);
  // Use a nonexistent identity so this local test never sends provider email.
  const missing = await post('forgot-password', { email: `absent-${randomUUID()}@worthlane.local` });
  assert.equal(missing.status, 200);
  assert.equal((await missing.json()).data.message, 'If that email exists, a reset code has been sent.');
  console.log('PASS: web reset persists, rejects replay/invalid/cross-origin requests, clears browser sessions, and signs in without exposing tokens.');
} finally {
  if (user) await prisma.user.delete({ where: { id: user.id } });
  await prisma.$disconnect();
}

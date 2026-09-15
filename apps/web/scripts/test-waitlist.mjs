import assert from "node:assert/strict";
import postgres from "postgres";
const target = process.env.WAITLIST_TEST_ORIGIN || "http://localhost:3315";
const db = process.env.WAITLIST_DATABASE_URL;
if (!db || !["localhost", "127.0.0.1"].includes(new URL(db).hostname) || !["localhost", "127.0.0.1"].includes(new URL(target).hostname)) throw new Error("Local synthetic database and server required");
const sql = postgres(db);
const email = `waitlist-test-${Date.now()}@example.com`;
const post = (body, origin = target) => fetch(`${target}/api/beta`, { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
try {
  await sql`DELETE FROM beta_rate_limits`;
  assert.equal((await post({ email, consent: false })).status, 400);
  assert.equal((await post({ email: "invalid", consent: true })).status, 400);
  assert.equal((await post({ email, consent: true }, "https://elsewhere.example")).status, 403);
  assert.equal((await post({ email: "x".repeat(3000), consent: true })).status, 413);
  assert.equal((await post({ email, consent: true, website: "spam" })).status, 200);
  assert.equal((await sql`SELECT count(*)::int AS n FROM beta_waitlist WHERE email = ${email}`)[0].n, 0);
  const responses = await Promise.all(Array.from({ length: 5 }, (_, index) => post({ email: index % 2 ? ` ${email.toUpperCase()} ` : email, consent: true })));
  assert.ok(responses.every(r => r.status === 200));
  const [saved] = await sql`SELECT * FROM beta_waitlist WHERE email = ${email}`;
  assert.equal(saved.consent_version, "beta-invitations-2026-09-10");
  assert.equal((await sql`SELECT count(*)::int AS n FROM beta_waitlist WHERE email = ${email}`)[0].n, 1);
  assert.equal((await post({ email, consent: true })).status, 429);
  // Make persistence unavailable and verify the API never claims success.
  await sql`ALTER TABLE beta_waitlist RENAME TO beta_waitlist_test_unavailable`;
  try {
    await sql`DELETE FROM beta_rate_limits`;
    assert.equal((await post({ email, consent: true })).status, 503);
  } finally { await sql`ALTER TABLE beta_waitlist_test_unavailable RENAME TO beta_waitlist`; }
  console.log("PASS: validation, consent, origin, body limit, honeypot, concurrent deduplication, persisted consent, rate limit, unavailable storage.");
} finally {
  await sql`DELETE FROM beta_waitlist WHERE email = ${email}`;
  await sql`DELETE FROM beta_rate_limits`;
  await sql.end();
}

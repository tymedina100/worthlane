import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { hashPassword, verifyPassword, createRefreshSession } from "../src/lib/auth";
import { POST as reset } from "../src/app/api/auth/reset-password/route";
import { POST as refresh } from "../src/app/api/auth/refresh/route";
import { POST as login } from "../src/app/api/auth/login/route";

const createdUsers: string[] = [];
let requestNumber = 0;
function request(body: unknown) {
  return new NextRequest("http://localhost/api/reset-test", {
    method: "POST", body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-real-ip": `198.51.100.${++requestNumber}` },
  });
}
async function fixture() {
  const email = `reset-${randomUUID()}@worthlane.local`;
  const oldPassword = "Synthetic-old-password-2026!";
  const user = await prisma.user.create({ data: { email, passwordHash: await hashPassword(oldPassword) } });
  createdUsers.push(user.id);
  const token = randomUUID().toUpperCase();
  const row = await prisma.passwordResetToken.create({ data: {
    userId: user.id, token, expiresAt: new Date(Date.now() + 60_000),
  } });
  return { user, oldPassword, token, row };
}
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.$disconnect();
});

it("consumes a persisted reset code once under concurrent requests and revokes refresh sessions", async () => {
  const { user, token, row, oldPassword } = await fixture();
  const oldSession = await createRefreshSession(user.id);
  const passwords = ["Synthetic-new-password-A!", "Synthetic-new-password-B!"];
  const results = await Promise.all(passwords.map(newPassword => reset(request({ token, newPassword }))));
  expect(results.map(result => result.status).sort()).toEqual([200, 400]);
  const winner = results.findIndex(result => result.status === 200);
  const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(await verifyPassword(passwords[winner], stored.passwordHash)).toBe(true);
  expect(await verifyPassword(passwords[1 - winner], stored.passwordHash)).toBe(false);
  expect((await prisma.passwordResetToken.findUniqueOrThrow({ where: { id: row.id } })).usedAt).not.toBeNull();
  expect((await refresh(request({ refreshToken: oldSession }))).status).toBe(401);
  expect((await login(request({ email: user.email, password: oldPassword }))).status).toBe(401);
  expect((await login(request({ email: user.email, password: passwords[winner] }))).status).toBe(200);
  expect((await reset(request({ token, newPassword: "Synthetic-replay-password!" }))).status).toBe(400);
  await prisma.$disconnect();
  expect(await verifyPassword(passwords[winner], (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash)).toBe(true);
});

it("rejects expired codes without changing the persisted password", async () => {
  const { user, token, row, oldPassword } = await fixture();
  await prisma.passwordResetToken.update({ where: { id: row.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  expect((await reset(request({ token, newPassword: "Synthetic-expired-attempt!" }))).status).toBe(400);
  expect(await verifyPassword(oldPassword, (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash)).toBe(true);
  expect((await prisma.passwordResetToken.findUniqueOrThrow({ where: { id: row.id } })).usedAt).toBeNull();
});

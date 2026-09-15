import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { createRefreshSession, signAccessToken } from "../src/lib/auth";
import { DELETE as deleteAccount } from "../src/app/api/auth/account/route";
import { POST as refresh } from "../src/app/api/auth/refresh/route";

const users: string[] = [];
const households: string[] = [];
async function fixture() {
  const user = await prisma.user.create({ data: {
    email: `deletion-${randomUUID()}@worthlane.local`, passwordHash: "synthetic-not-a-login-hash",
  } });
  users.push(user.id);
  const account = await prisma.account.create({ data: {
    userId: user.id, name: "Synthetic checking", type: "CHECKING", currentBalance: "123.45",
  } });
  const category = await prisma.category.create({ data: {
    userId: user.id, name: "Synthetic category", icon: "test", color: "#123456",
  } });
  const budget = await prisma.budget.create({ data: { userId: user.id, categoryId: category.id, amount: "50.00" } });
  return { user, account, category, budget, session: await createRefreshSession(user.id) };
}
function deletionRequest(user: { id: string; email: string }) {
  return new NextRequest("http://localhost/api/auth/account", { method: "DELETE",
    headers: { authorization: `Bearer ${signAccessToken({ sub: user.id, email: user.email })}` } });
}
afterAll(async () => {
  await prisma.household.deleteMany({ where: { id: { in: households } } });
  await prisma.budget.deleteMany({ where: { userId: { in: users } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});

it("persists account removal, revokes sessions and preserves the consenting partner's own data", async () => {
  const departing = await fixture();
  const partner = await fixture();
  const household = await prisma.household.create({ data: {
    name: "Deletion acceptance", slug: randomUUID(), members: { create: [
      { userId: departing.user.id, displayName: "Departing", role: "OWNER", status: "ACTIVE" },
      { userId: partner.user.id, displayName: "Remaining", role: "MEMBER", status: "ACTIVE" },
    ] },
  }, include: { members: true } });
  households.push(household.id);
  const departedMember = household.members.find(m => m.userId === departing.user.id)!;
  const partnerMember = household.members.find(m => m.userId === partner.user.id)!;
  const responsibility = await prisma.householdResponsibility.create({ data: {
    householdId: household.id, slug: "groceries", name: "Groceries", monthlyAmount: "600", mode: "PERCENTAGE",
    allocations: { create: [
      { memberId: departedMember.id, shareBasisPoints: 6000 },
      { memberId: partnerMember.id, shareBasisPoints: 4000 },
    ] },
  } });
  expect((await deleteAccount(new NextRequest("http://localhost/api/auth/account", { method: "DELETE" }))).status).toBe(401);
  expect(await prisma.user.count({ where: { id: departing.user.id } })).toBe(1);
  expect((await deleteAccount(deletionRequest(departing.user))).status).toBe(200);
  await prisma.$disconnect();
  expect(await prisma.user.findUnique({ where: { id: departing.user.id } })).toBeNull();
  expect(await prisma.account.findUnique({ where: { id: departing.account.id } })).toBeNull();
  expect(await prisma.category.findUnique({ where: { id: departing.category.id } })).toBeNull();
  expect(await prisma.budget.findUnique({ where: { id: departing.budget.id } })).toBeNull();
  expect(await prisma.refreshSession.count({ where: { userId: departing.user.id } })).toBe(0);
  expect((await refresh(new NextRequest("http://localhost/api/auth/refresh", { method: "POST",
    headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: departing.session }) }))).status).toBe(401);
  expect(await prisma.account.findUnique({ where: { id: partner.account.id } })).toEqual(partner.account);
  expect(await prisma.budget.findUnique({ where: { id: partner.budget.id } })).toEqual(partner.budget);
  expect(await prisma.householdMember.findUnique({ where: { id: departedMember.id } })).toMatchObject({ userId: null, status: "REMOVED" });
  expect(await prisma.householdMember.findUnique({ where: { id: partnerMember.id } })).toMatchObject({ userId: partner.user.id, status: "ACTIVE", role: "OWNER" });
  const agreement = await prisma.householdResponsibility.findUniqueOrThrow({ where: { id: responsibility.id }, include: { allocations: true } });
  expect(agreement.mode).toBe("MEMBER");
  expect(agreement.allocations.map(a => [a.memberId, a.shareBasisPoints])).toEqual([[partnerMember.id, 10000]]);
  expect((await refresh(new NextRequest("http://localhost/api/auth/refresh", { method: "POST",
    headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: partner.session }) }))).status).toBe(200);
  // Deleting the final member also removes the now-empty household.
  expect((await deleteAccount(deletionRequest(partner.user))).status).toBe(200);
  await prisma.$disconnect();
  expect(await prisma.household.findUnique({ where: { id: household.id } })).toBeNull();
  expect(await prisma.householdResponsibility.findUnique({ where: { id: responsibility.id } })).toBeNull();
});

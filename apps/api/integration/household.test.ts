import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Transaction as PlaidTransaction } from "plaid";
import { applyPlaidSyncBatch } from "../src/lib/plaid-reconciliation";
import { weekRangeInTimeZone } from "@worthlane/core";
import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { householdSummarySchema } from "@worthlane/contracts";
import { POST as register } from "../src/app/api/auth/register/route";
import { POST as login } from "../src/app/api/auth/login/route";
import { POST as createHousehold } from "../src/app/api/households/route";
import { POST as invite } from "../src/app/api/households/current/partners/link/route";
import { GET as invitations } from "../src/app/api/households/invitations/route";
import { POST as accept } from "../src/app/api/households/invitations/accept/route";
import { GET as summary } from "../src/app/api/households/current/summary/route";
import { POST as createResponsibility } from "../src/app/api/households/current/responsibilities/route";
import { POST as createAccount } from "../src/app/api/accounts/route";
import { POST as createTransaction } from "../src/app/api/transactions/route";
import { GET as personalBudgets } from "../src/app/api/budgets/route";
import { GET as dashboard } from "../src/app/api/dashboard/route";
import { GET as spendingReport } from "../src/app/api/reports/spending/route";
import { GET as cashflow } from "../src/app/api/reports/cashflow/route";
import { getHouseholdAccountDetail, setHouseholdAccountVisibility } from "../src/lib/household";

type Handler = (req: NextRequest) => Promise<Response>;
function request(token?: string, body?: unknown) {
  return new NextRequest("http://localhost/api/integration", {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function call(handler: Handler, token?: string, body?: unknown, status = 200) {
  const response = await handler(request(token, body));
  // Never print session tokens when an assertion fails.
  expect(response.status).toBe(status);
  return (await response.json()).data;
}
async function readSummary(token: string) {
  return householdSummarySchema.parse(await call(summary, token));
}
const password = "Synthetic-only-passphrase!2026";
const suffix = randomUUID();
async function newUser(name: string) {
  const email = `${name}-${suffix}@worthlane.local`;
  const session = await call(register, undefined, { email, password }, 201);
  return { id: session.user.id as string, token: session.accessToken as string, email };
}
afterAll(async () => { await prisma.$disconnect(); });

describe("persistent household consent and budget journey", () => {
  it("bootstraps standard categories without demo users and preserves existing IDs", async () => {
    const before = await prisma.category.findMany({ where: { isSystem: true }, orderBy: { name: "asc" } });
    expect(before).toHaveLength(16);
    expect(before.find((category) => category.name === "Food & Drink")).toBeDefined();
    expect(await prisma.user.count()).toBe(0);
    // Exercise the migration's existing-data branch as well as a fresh deploy.
    await prisma.$executeRawUnsafe(readFileSync(new URL("../../../packages/db/prisma/migrations/20260908130000_bootstrap_categories/migration.sql", import.meta.url), "utf8"));
    expect(await prisma.category.findMany({ where: { isSystem: true }, orderBy: { name: "asc" } })).toEqual(before);
  });
  it("keeps reports and dashboard in the household month while UTC is ahead", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-01T02:00:00Z"));
    try {
      const owner = await newUser("boundary");
      await call(createHousehold, owner.token, {
        name: "Boundary household", displayName: "Alex", timezone: "America/Phoenix", currency: "USD",
      }, 201);
      const account = await call(createAccount, owner.token, {
        name: "Boundary checking", type: "CHECKING", currentBalance: 100,
      }, 201);
      await prisma.transaction.createMany({ data: [
        { userId: owner.id, accountId: account.id, amount: "3", date: new Date("2026-08-01T06:59:59.999Z") },
        { userId: owner.id, accountId: account.id, amount: "7", date: new Date("2026-09-01T01:00:00Z") },
        { userId: owner.id, accountId: account.id, amount: "9", date: new Date("2026-09-01T07:00:00Z") },
      ] });
      const report = await call(spendingReport, owner.token);
      expect(report).toMatchObject({ month: "2026-08", totalSpending: 7 });
      const cash = await call(cashflow, owner.token);
      expect(cash.months.at(-1)).toMatchObject({ month: "2026-08", spending: 7 });
      expect(cash.months.at(-2)).toMatchObject({ month: "2026-07", spending: 3 });
      expect((await call(dashboard, owner.token)).monthlySpending).toBe(7);
    } finally { vi.useRealTimers(); }
  });
  it("registers solo, joins with consent, persists splits across login, and enforces account privacy", async () => {
    const owner = await newUser("owner");
    const outsider = await newUser("outsider");
    await call(summary, undefined, undefined, 401);
    const household = await call(createHousehold, owner.token, {
      name: "Synthetic household", displayName: "Alex", timezone: "America/Phoenix", currency: "USD",
    }, 201);
    const solo = await readSummary(owner.token);
    expect(solo.asOf).toBeDefined();
    expect(solo.members).toHaveLength(1);
    expect(solo.household.id).toBe(household.householdId);
    const firstInvite = await call(invite, owner.token, { email: `partner-${suffix}@worthlane.local`, displayName: "Sam" }, 202);
    const partner = await newUser("partner");
    const replacement = await call(invite, owner.token, { email: partner.email, displayName: "Sam" }, 202);
    // An invitation is not consent and grants no data access.
    await call(summary, partner.token, undefined, 404);
    const pending = await call(invitations, partner.token);
    expect(pending).toHaveLength(0); // Email knowledge alone reveals no new invitation.
    expect(await prisma.householdMember.count({ where: { householdId: solo.household.id, status: "INVITED" } })).toBe(1);
    await call(accept, partner.token, { invitationCode: firstInvite.invitationCode }, 404);
    await call(accept, outsider.token, { invitationCode: replacement.invitationCode }, 404);
    const storedInvite = await prisma.householdMember.findFirstOrThrow({ where: { householdId: solo.household.id, status: "INVITED" } });
    expect(storedInvite.inviteTokenHash).not.toBe(replacement.invitationCode);
    await call(accept, partner.token, { invitationId: storedInvite.id }, 404);
    await call(accept, partner.token, { invitationCode: replacement.invitationCode });
    expect((await prisma.householdMember.findUniqueOrThrow({ where: { id: storedInvite.id } })).inviteTokenHash).toBeNull();
    const joined = await readSummary(partner.token);
    expect(joined.household.id).toBe(solo.household.id);
    expect(joined.members).toHaveLength(2);
    const staleInvite = await prisma.householdMember.create({ data: { householdId: solo.household.id, userId: outsider.id, displayName: "Outsider", status: "INVITED" } });
    await call(accept, outsider.token, { invitationId: staleInvite.id }, 409);
    await prisma.householdMember.update({ where: { id: staleInvite.id }, data: { status: "REMOVED" } });
    const ownerId = solo.viewerMemberId;
    const partnerId = joined.viewerMemberId;

    for (const fixture of [
      { name: "Groceries", monthlyAmountMinor: 60_000, assignment: { mode: "EQUAL", memberIds: [ownerId, partnerId] } },
      { name: "Utilities", monthlyAmountMinor: 15_000, assignment: { mode: "ASSIGNED", memberId: partnerId } },
      { name: "Rent", monthlyAmountMinor: 170_000, assignment: { mode: "PERCENTAGE", shares: [
        { memberId: ownerId, basisPoints: 6000 }, { memberId: partnerId, basisPoints: 4000 },
      ] } },
    ]) {
      await call(createResponsibility, owner.token, fixture, 201);
    }
    await call(invite, owner.token, { email: outsider.email }, 202);
    expect(await call(invitations, outsider.token)).toHaveLength(0);
    await call(summary, outsider.token, undefined, 404);

    // Reconnect Prisma and obtain fresh credentials: assertions read stored rows,
    // not a fixture cache or the create endpoint's response.
    await prisma.$disconnect();
    const freshOwner = await call(login, undefined, { email: owner.email, password });
    const freshPartner = await call(login, undefined, { email: partner.email, password });
    const first = await readSummary(freshOwner.accessToken);
    const second = await readSummary(freshPartner.accessToken);
    expect(first.responsibilities).toEqual(second.responsibilities);
    const byName = new Map(first.responsibilities.map(row => [row.name, row]));
    expect(byName.get("Groceries")?.allocations.map(a => a.assignedMinor).sort()).toEqual([30_000, 30_000]);
    expect(byName.get("Utilities")?.allocations).toEqual([expect.objectContaining({ memberId: partnerId, assignedMinor: 15_000 })]);
    expect(byName.get("Rent")?.allocations).toEqual(expect.arrayContaining([
      expect.objectContaining({ memberId: ownerId, assignedMinor: 102_000 }),
      expect.objectContaining({ memberId: partnerId, assignedMinor: 68_000 }),
    ]));
    expect(first.responsibilities.reduce((n, row) => n + row.monthlyAmountMinor, 0)).toBe(245_000);

    const account = await call(createAccount, owner.token, {
      name: "Private synthetic checking", type: "CHECKING", currentBalance: 123.45,
    }, 201);
    expect((await readSummary(partner.token)).finances.detailedAccounts).toHaveLength(0);
    await expect(getHouseholdAccountDetail(partner.id, account.id)).rejects.toThrow("Account not found");
    await expect(setHouseholdAccountVisibility(partner.id, account.id, { visibility: "SHARED" })).rejects.toThrow("Account not found");
    await setHouseholdAccountVisibility(owner.id, account.id, { visibility: "SUMMARY" });
    const summarized = await readSummary(partner.token);
    expect(summarized.finances.detailedAccounts).toHaveLength(0);
    expect(summarized.finances.summaryOnlyByOwner[0].netWorthMinor).toBe(12_345);
    await expect(getHouseholdAccountDetail(partner.id, account.id)).rejects.toThrow("Account not found");
    await setHouseholdAccountVisibility(owner.id, account.id, { visibility: "SHARED" });
    expect((await getHouseholdAccountDetail(partner.id, account.id)).id).toBe(account.id);
    // The owner pays for a category assigned entirely to the partner. The
    // agreed responsibility must not change with the identity of the payer.
    const category = await prisma.category.create({ data: {
      name: `Utilities ${suffix}`, icon: "home", color: "#336699", userId: owner.id,
    } });
    await prisma.householdResponsibility.update({
      where: { id: byName.get("Utilities")!.id }, data: { categoryId: category.id },
    });
    await prisma.transaction.create({ data: {
      userId: owner.id, accountId: account.id, categoryId: category.id,
      amount: "101.01", date: new Date(), isManual: true,
    } });
    const ownerActivity = await readSummary(owner.token);
    const partnerActivity = await readSummary(partner.token);
    expect(ownerActivity.responsibilities).toEqual(partnerActivity.responsibilities);
    expect(partnerActivity.responsibilities.find(row => row.name === "Utilities")?.allocations)
      .toEqual([expect.objectContaining({ memberId: partnerId, assignedMinor: 15_000,
        appliedSpendMinor: 10_101, remainingMinor: 4_899 })]);
    const groceries = await prisma.category.create({ data: {
      name: `Groceries ${suffix}`, icon: "food", color: "#336699", userId: owner.id,
    } });
    await prisma.householdResponsibility.update({
      where: { id: byName.get("Groceries")!.id }, data: { categoryId: groceries.id },
    });
    await prisma.transaction.create({ data: {
      userId: owner.id, accountId: account.id, categoryId: groceries.id,
      amount: "100.01", date: new Date(), isManual: true,
    } });
    const splitSpend = (await readSummary(partner.token)).responsibilities
      .find(row => row.name === "Groceries")!.allocations;
    expect(splitSpend.map(row => row.appliedSpendMinor).sort((a, b) => a - b)).toEqual([5000, 5001]);
    expect(splitSpend.reduce((sum, row) => sum + row.remainingMinor, 0)).toBe(49_999);
    const addCredit = (amount: number, spendingTreatment: string) => call(createTransaction, owner.token, {
      accountId: account.id, categoryId: groceries.id, amount, spendingTreatment,
      date: new Date().toISOString(),
    }, 201);
    await addCredit(-20.01, "REFUND");
    await addCredit(-900, "AUTO"); // income must not reduce grocery spending
    await addCredit(500, "EXCLUDED"); // transfer or repayment is not consumption
    const afterRefund = (await readSummary(partner.token)).responsibilities
      .find(row => row.name === "Groceries")!.allocations;
    expect(afterRefund.map(row => row.appliedSpendMinor)).toEqual([4000, 4000]);
    await call(createTransaction, owner.token, {
      accountId: account.id, amount: 1, spendingTreatment: "REFUND", date: new Date().toISOString(),
    }, 400);
    await addCredit(-100, "REFUND");
    const netCredit = (await readSummary(partner.token)).responsibilities
      .find(row => row.name === "Groceries")!.allocations;
    expect(netCredit.map(row => row.appliedSpendMinor)).toEqual([-1000, -1000]);
    expect(netCredit.reduce((sum, row) => sum + row.remainingMinor, 0)).toBe(62_000);
    await prisma.budget.create({ data: { userId: owner.id, categoryId: groceries.id, amount: "600" } });
    const personalBudget = (await call(personalBudgets, owner.token))[0];
    expect(personalBudget.spent).toBe(-20);
    expect(personalBudget.remaining).toBe(620);
    const snapshot = await call(dashboard, owner.token);
    expect(snapshot.monthlySpending).toBe(81.01);
    expect(snapshot.monthlyIncome).toBe(900);
    expect(snapshot.budgets[0].spent).toBe(-20);
    const report = await call(spendingReport, owner.token);
    expect(report.totalSpending).toBe(81.01);
    expect(report.income).toBe(900);
    const cash = await call(cashflow, owner.token);
    expect(cash.months.at(-1)).toMatchObject({ spending: 81.01, income: 900, net: 818.99 });
    const weeklyCategory = await prisma.category.create({ data: {
      name: `Weekly ${suffix}`, icon: "food", color: "#336699", userId: owner.id,
    } });
    const weeklyBudget = await prisma.budget.create({ data: {
      userId: owner.id, categoryId: weeklyCategory.id, amount: "50", period: "WEEKLY",
    } });
    const week = weekRangeInTimeZone(new Date(), "America/Phoenix");
    await prisma.transaction.createMany({ data: [
      { userId: owner.id, accountId: account.id, categoryId: weeklyCategory.id,
        amount: "35", date: new Date(week.start.getTime() - 1), isManual: true },
      { userId: owner.id, accountId: account.id, categoryId: weeklyCategory.id,
        amount: "10", date: new Date(), isManual: true },
      { userId: owner.id, accountId: account.id, categoryId: weeklyCategory.id,
        amount: "100", date: new Date(Date.now() + 60_000), isManual: true },
    ] });
    expect((await call(personalBudgets, owner.token)).find((row: { id: string }) => row.id === weeklyBudget.id))
      .toMatchObject({ spent: 10, remaining: 40, period: "WEEKLY" });
    expect((await call(dashboard, owner.token)).budgets.find((row: { id: string }) => row.id === weeklyBudget.id))
      .toMatchObject({ spent: 10, remaining: 40 });
    await setHouseholdAccountVisibility(owner.id, account.id, { visibility: "PERSONAL" });
    expect((await readSummary(partner.token)).finances.visibleNetWorthMinor).toBe(0);
    expect((await readSummary(partner.token)).responsibilities.find(row => row.name === "Utilities")
      ?.allocations[0].appliedSpendMinor).toBe(0);
    await expect(getHouseholdAccountDetail(partner.id, account.id)).rejects.toThrow("Account not found");
  });
});

it("atomically reconciles pending, posted, modified, removed and stale Plaid batches", async () => {
  const user = await prisma.user.create({ data: { email: `reconcile-${randomUUID()}@worthlane.local`, passwordHash: "synthetic-unused" } });
  const account = await prisma.account.create({ data: { userId: user.id, name: "Synthetic bank", type: "CHECKING", source: "PLAID", currentBalance: 100 } });
  const item = await prisma.plaidItem.create({ data: { userId: user.id, itemId: `synthetic-${randomUUID()}`, accessTokenEncrypted: "not-a-provider-token" } });
  const map = new Map([["account", account.id]]);
  const bankTx = (id: string, amount: number, pending = false, pendingId: string | null = null) => ({ transaction_id: id, account_id: "account", amount, date: "2026-09-08", name: "Synthetic purchase", pending, pending_transaction_id: pendingId }) as PlaidTransaction;
  const apply = async (cursor: string | null, next: string, added: PlaidTransaction[] = [], modified: PlaidTransaction[] = [], removed: string[] = []) => applyPlaidSyncBatch({ id: item.id, userId: user.id, syncCursor: cursor }, map, { added, modified, removed: removed.map((transaction_id) => ({ transaction_id })) }, next, new Date());
  const pendingId = `pending-${randomUUID()}`;
  const postedId = `posted-${randomUUID()}`;
  await apply(null, "one", [bankTx(pendingId, 10, true)]);
  expect(await prisma.transaction.count({ where: { accountId: account.id } })).toBe(0);
  // An older deployment may already have saved a pending authorization.
  await prisma.transaction.create({ data: { userId: user.id, accountId: account.id, plaidTransactionId: pendingId, amount: 10, date: new Date() } });
  await apply("one", "two", [bankTx(postedId, 12, false, pendingId)]);
  expect(await prisma.transaction.count({ where: { accountId: account.id } })).toBe(1);
  await apply("two", "three", [bankTx(postedId, 12, false, pendingId)]);
  expect(await prisma.transaction.count({ where: { accountId: account.id } })).toBe(1);
  await expect(apply("two", "old", [], [bankTx(postedId, 999)])).rejects.toMatchObject({ code: "SYNC_CONFLICT" });
  await prisma.transaction.update({ where: { plaidTransactionId: postedId }, data: { categoryId: null, categoryOverridden: true, note: "User note", spendingTreatment: "EXCLUDED" } });
  await apply("three", "four", [], [bankTx(postedId, 15)]);
  expect(await prisma.transaction.findUniqueOrThrow({ where: { plaidTransactionId: postedId } })).toMatchObject({ categoryId: null, note: "User note", spendingTreatment: "EXCLUDED" });
  expect((await prisma.transaction.findUniqueOrThrow({ where: { plaidTransactionId: postedId } })).amount.toNumber()).toBe(15);
  const other = await prisma.user.create({ data: { email: `collision-${randomUUID()}@worthlane.local`, passwordHash: "synthetic-unused" } });
  const otherAccount = await prisma.account.create({ data: { userId: other.id, name: "Other", type: "CHECKING", currentBalance: 0 } });
  const collision = `collision-${randomUUID()}`;
  await prisma.transaction.create({ data: { userId: other.id, accountId: otherAccount.id, plaidTransactionId: collision, amount: 1, date: new Date() } });
  await expect(apply("four", "bad", [], [bankTx(postedId, 999), bankTx(collision, 2)])).rejects.toMatchObject({ code: "SYNC_OWNER_CONFLICT" });
  expect((await prisma.transaction.findUniqueOrThrow({ where: { plaidTransactionId: postedId } })).amount.toNumber()).toBe(15);
  expect((await prisma.plaidItem.findUniqueOrThrow({ where: { id: item.id } })).syncCursor).toBe("four");
  await apply("four", "five", [], [], [postedId, collision]);
  expect(await prisma.transaction.count({ where: { accountId: account.id } })).toBe(0);
  expect(await prisma.transaction.count({ where: { accountId: otherAccount.id } })).toBe(1);
});

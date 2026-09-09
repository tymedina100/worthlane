import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Transaction as PlaidTransaction } from "plaid";
import { applyPlaidSyncBatch } from "../src/lib/plaid-reconciliation";
import { createHouseholdForUser } from "../src/lib/household";
import { spendingWhere, incomeWhere } from "../src/lib/spending-treatment";
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
import { POST as saveDebtPlan, GET as listDebtPlans } from "../src/app/api/debt-plans/route";
import { GET as readDebtPlan, PATCH as editDebtPlan } from "../src/app/api/debt-plans/[id]/route";
import { POST as addDebtDueDate } from "../src/app/api/debt-plans/[id]/upcoming/route";
import { POST as createUpcoming, GET as listUpcoming } from "../src/app/api/upcoming/route";
import { POST as payUpcoming, PATCH as editUpcoming } from "../src/app/api/upcoming/[id]/route";
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
      const bill = await call(createUpcoming, owner.token, { name: "Month-end bill", amount: 25, dueDate: "2026-08-31", frequency: "MONTHLY" }, 201);
      expect(bill.status).toBe("DUE_TODAY");
      expect((await call(listUpcoming, owner.token)).items[0].status).toBe("DUE_TODAY");
      expect((await call(dashboard, owner.token)).today.dueNextSevenDays).toBe(25);
      const pay = (req: NextRequest) => payUpcoming(req, { params: { id: bill.id } });
      let currentBill = await call(pay, owner.token, { action: "markPaid", expectedUpdatedAt: bill.updatedAt });
      expect(currentBill.dueDate).toBe("2026-09-30");
      await call(pay, owner.token, { action: "markPaid", expectedUpdatedAt: bill.updatedAt }, 409);
      const editBill = (req: NextRequest) => editUpcoming(req, { params: { id: bill.id } });
      currentBill = await call(editBill, owner.token, { amount: 30, dueDate: "2026-09-30", expectedUpdatedAt: currentBill.updatedAt });
      currentBill = await call(pay, owner.token, { action: "markPaid", expectedUpdatedAt: currentBill.updatedAt });
      expect(currentBill.dueDate).toBe("2026-10-31");
      expect((await prisma.upcomingObligation.findUniqueOrThrow({ where: { id: bill.id } })).anchorDay).toBe(31);
      currentBill = await call(editBill, owner.token, { dueDate: "2026-10-20", expectedUpdatedAt: currentBill.updatedAt });
      await call(editBill, owner.token, { amount: 999, expectedUpdatedAt: bill.updatedAt }, 409);
      const simultaneous = await Promise.all([1, 2].map(() => pay(request(owner.token, { action: "markPaid", expectedUpdatedAt: currentBill.updatedAt }))));
      expect(simultaneous.map(response => response.status).sort()).toEqual([200, 409]);
      expect((await prisma.upcomingObligation.findUniqueOrThrow({ where: { id: bill.id } })).dueDate.toISOString().slice(0, 10)).toBe("2026-11-20");
      expect((await prisma.upcomingObligation.findUniqueOrThrow({ where: { id: bill.id } })).anchorDay).toBe(20);
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
    const bankItem = await prisma.plaidItem.create({ data: { userId: owner.id, itemId: randomUUID(), accessTokenEncrypted: "synthetic-unused", transactionHistoryStatus: "INITIAL_UPDATE_COMPLETE", lastSyncAt: new Date() } });
    await prisma.account.update({ where: { id: account.id }, data: { source: "PLAID", plaidItemId: bankItem.itemId } });
    expect((await readSummary(owner.token)).finances.bankDataNotices).toEqual([expect.objectContaining({ accountId: account.id, message: expect.stringContaining("older history is still loading") })]);
    expect((await readSummary(partner.token)).finances.bankDataNotices).toEqual([]);
    await setHouseholdAccountVisibility(owner.id, account.id, { visibility: "SHARED" });
    expect((await readSummary(partner.token)).finances.bankDataNotices).toHaveLength(1);
    await setHouseholdAccountVisibility(owner.id, account.id, { visibility: "SUMMARY" });
    expect((await readSummary(partner.token)).finances.bankDataNotices).toEqual([]);
    await setHouseholdAccountVisibility(owner.id, account.id, { visibility: "PERSONAL" });
    expect((await readSummary(partner.token)).finances.bankDataNotices).toEqual([]);
    // Continue the manual-entry journey with its original account source.
    await prisma.account.update({ where: { id: account.id }, data: { source: "MANUAL", plaidItemId: null } });
    await prisma.plaidItem.delete({ where: { id: bankItem.id } });
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

it("persists private debt estimates across login and rejects stale edits", async () => {
  const owner = await newUser("debt-owner");
  const stranger = await newUser("debt-stranger");
  const input = { name: "Synthetic payoff", startMonth: "2026-09", strategy: "AVALANCHE", monthlyPaymentMinor: 3000, debts: [{ id: "card", name: "Manual card", balanceMinor: 10000, minimumPaymentMinor: 1000, aprBasisPoints: 0, statementBalanceMinor: 8500, dueDate: "2026-09-20" }] };
  await call(saveDebtPlan, undefined, input, 401);
  await call(saveDebtPlan, owner.token, { ...input, userId: stranger.id }, 400);
  const saved = await call(saveDebtPlan, owner.token, input, 201);
  expect(saved.estimate).toMatchObject({ status: "PAID_OFF", totalPaidMinor: 10000, totalInterestMinor: 0, payoffMonth: "2026-12" });
  expect(saved.input.debts[0]).toMatchObject({ balanceMinor: 10000, statementBalanceMinor: 8500, minimumPaymentMinor: 1000, dueDate: "2026-09-20" });
  const read = (req: NextRequest) => readDebtPlan(req, { params: { id: saved.id } });
  const addDue = (req: NextRequest) => addDebtDueDate(req, { params: { id: saved.id } });
  await call(addDue, stranger.token, { revision: 1, entryId: "card" }, 404);
  const due = await call(addDue, owner.token, { revision: 1, entryId: "card" });
  expect(due).toMatchObject({ amount: 10, dueDate: "2026-09-20", alreadyExists: false });
  await prisma.upcomingObligation.update({ where: { id: due.id }, data: { isPaid: true } });
  const repeated = await call(addDue, owner.token, { revision: 1, entryId: "card" });
  expect(repeated).toMatchObject({ id: due.id, alreadyExists: true });
  expect(await prisma.upcomingObligation.count({ where: { userId: owner.id } })).toBe(1);
  expect(await prisma.upcomingObligation.findUniqueOrThrow({ where: { id: due.id } })).toMatchObject({ isPaid: true, frequency: null, reminderTiming: "NONE" });
  const edit = (req: NextRequest) => editDebtPlan(req, { params: { id: saved.id } });
  await call(read, stranger.token, undefined, 404);
  expect(await call(listDebtPlans, stranger.token)).toEqual([]);
  await call(edit, stranger.token, { revision: 1, input }, 404);
  const relogin = await call(login, undefined, { email: owner.email, password });
  expect((await call(read, relogin.accessToken)).input).toEqual(saved.input);
  const bankReference = { source: "USER_REVIEWED_PLAID_LIABILITIES", retrievedAt: "2026-09-08T12:00:00.000Z", reviewedAt: "2026-09-08T12:05:00.000Z" };
  const revised = await call(edit, relogin.accessToken, { revision: 1, input: { ...input, strategy: "SNOWBALL", monthlyPaymentMinor: 5000, debts: input.debts.map(debt => ({ ...debt, bankReference })) } });
  expect((await call(read, relogin.accessToken)).input.debts[0].bankReference).toEqual(bankReference);
  expect(revised).toMatchObject({ revision: 2, estimate: { payoffMonth: "2026-10" } });
  await call(addDue, owner.token, { revision: 1, entryId: "card" }, 409);
  await call(edit, owner.token, { revision: 1, input }, 409);
  expect((await call(read, owner.token)).input.monthlyPaymentMinor).toBe(5000);
  expect(await prisma.debtPlanEntry.count({ where: { planId: saved.id } })).toBe(1);
  const insufficient = await call(edit, owner.token, { revision: 2, input: { ...input, monthlyPaymentMinor: 999 } });
  expect(insufficient.estimate).toMatchObject({ status: "INSUFFICIENT_PAYMENT", shortfallMinor: 1, payoffMonth: null });
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
  await prisma.transaction.update({ where: { plaidTransactionId: postedId }, data: { categoryId: null, categoryOverridden: true, note: "User note", spendingTreatment: "EXCLUDED", treatmentOverridden: true } });
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
  const classified = (amount: number, primary: string, detailed: string) => ({ ...bankTx(randomUUID(), amount), date: "2026-09-01", personal_finance_category: { primary, detailed, confidence_level: "VERY_HIGH" } });
  const transfers = [classified(50, "TRANSFER_OUT", "TRANSFER_OUT_ACCOUNT_TRANSFER"), classified(-50, "TRANSFER_IN", "TRANSFER_IN_ACCOUNT_TRANSFER"), classified(100, "LOAN_PAYMENTS", "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT")];
  await apply("five", "six", [...transfers, classified(20, "LOAN_PAYMENTS", "LOAN_PAYMENTS_MORTGAGE_PAYMENT"), classified(-100, "INCOME", "INCOME_WAGES")]);
  expect((await prisma.transaction.aggregate({ where: { accountId: account.id, ...spendingWhere }, _sum: { amount: true } }))._sum.amount?.toNumber()).toBe(20);
  expect((await prisma.transaction.aggregate({ where: { accountId: account.id, ...incomeWhere }, _sum: { amount: true } }))._sum.amount?.toNumber()).toBe(-100);
  const manual = await prisma.transaction.create({ data: { userId: user.id, accountId: account.id, amount: 1, date: new Date("2026-09-01T00:00:00Z"), isManual: true } });
  await createHouseholdForUser(user.id, { name: "Bank calendar", displayName: "Alex", timezone: "America/Phoenix", currency: "USD" });
  const rows = await prisma.transaction.findMany({ where: { accountId: account.id, bankDate: { not: null } } });
  expect(rows).toHaveLength(5);
  expect(rows.every(row => row.bankDate === "2026-09-01" && row.date.toISOString() === "2026-09-01T07:00:00.000Z")).toBe(true);
  expect((await prisma.transaction.findUniqueOrThrow({ where: { id: manual.id } })).date.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  await apply("six", "seven", [], [transfers[0]!]);
  expect((await prisma.transaction.findUniqueOrThrow({ where: { plaidTransactionId: transfers[0]!.transaction_id } })).date.toISOString()).toBe("2026-09-01T07:00:00.000Z");
  await applyPlaidSyncBatch({ id: item.id, userId: user.id, syncCursor: "seven" }, map, { added: [], modified: [], removed: [] }, "eight", new Date(), "INITIAL_UPDATE_COMPLETE");
  expect((await prisma.plaidItem.findUniqueOrThrow({ where: { id: item.id } })).transactionHistoryStatus).toBe("INITIAL_UPDATE_COMPLETE");
  await expect(applyPlaidSyncBatch({ id: item.id, userId: user.id, syncCursor: "seven" }, map, { added: [], modified: [], removed: [] }, "stale", new Date(), "HISTORICAL_UPDATE_COMPLETE")).rejects.toMatchObject({ code: "SYNC_CONFLICT" });
  expect((await prisma.plaidItem.findUniqueOrThrow({ where: { id: item.id } })).transactionHistoryStatus).toBe("INITIAL_UPDATE_COMPLETE");
});

import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@worthlane/db";
import type { AccountBase } from "plaid";
import { revokePlaidData } from "../src/lib/plaid-revocation";
import { savePlaidAccounts } from "../src/lib/plaid-accounts";
import { applyPlaidSyncBatch } from "../src/lib/plaid-reconciliation";
import { snapshotUserNetWorth } from "../src/lib/net-worth";
import { generateNudgesForUser } from "../src/lib/nudge-engine";
import { detectRecurringForUser } from "../src/lib/recurring";

afterAll(() => prisma.$disconnect());
it("removes only revoked provider data, keeps manual and other-owner data, and rejects stale snapshots", async () => {
  const suffix = randomUUID();
  const owner = await prisma.user.create({ data: { email: `revocation-${suffix}@worthlane.local`, passwordHash: "unusable-test-hash" } });
  const partner = await prisma.user.create({ data: { email: `partner-${suffix}@worthlane.local`, passwordHash: "unusable-test-hash" } });
  try {
    const item = await prisma.plaidItem.create({ data: { userId: owner.id, itemId: `item-${suffix}`, accessTokenEncrypted: "unused-test-placeholder" } });
    const bank = (id: string): AccountBase => ({ account_id: `${suffix}-${id}`, name: "Synthetic bank account", type: "depository", subtype: "checking", balances: { current: 100, available: 100, limit: null, iso_currency_code: "USD", unofficial_currency_code: null } });
    const first = bank("first"); const second = bank("second");
    const map = await savePlaidAccounts(item, [first, second]);
    const revokedId = map.get(first.account_id)!; const retainedId = map.get(second.account_id)!;
    const partnerAccount = await prisma.account.create({ data: { userId: partner.id, name: "Partner manual", type: "CHECKING", currentBalance: 50 } });
    const imported = await prisma.transaction.create({ data: { userId: owner.id, accountId: revokedId, amount: 20, date: new Date(), plaidTransactionId: `import-${suffix}`, merchantName: "Synthetic", isImpulse: true } });
    const manual = await prisma.transaction.create({ data: { userId: owner.id, accountId: revokedId, amount: 7, date: new Date(), merchantName: "User entry", isManual: true } });
    const unrelated = await prisma.transaction.create({ data: { userId: owner.id, accountId: retainedId, amount: 9, date: new Date(), plaidTransactionId: `retained-${suffix}` } });
    await prisma.recurringTransaction.create({ data: { userId: owner.id, accountId: retainedId, normalizedMerchant: "synthetic", displayName: "Synthetic", averageAmount: 20, frequency: "MONTHLY", lastSeenDate: new Date(), nextDueDate: new Date(), occurrenceCount: 3 } });
    await generateNudgesForUser(owner.id);
    expect(await prisma.nudge.count({ where: { userId: owner.id } })).toBeGreaterThan(0);
    await snapshotUserNetWorth(owner.id);
    await snapshotUserNetWorth(partner.id);

    // A malicious/mismatched account ID must not widen deletion to the Item.
    await revokePlaidData(item, "not-an-owned-provider-account");
    expect(await prisma.account.count({ where: { userId: owner.id } })).toBe(2);
    await revokePlaidData(item, first.account_id);
    expect(await prisma.account.findUnique({ where: { id: revokedId } })).toBeNull();
    expect(await prisma.transaction.findUnique({ where: { id: imported.id } })).toBeNull();
    const keptManual = await prisma.transaction.findUniqueOrThrow({ where: { id: manual.id }, include: { account: true } });
    expect(keptManual.account.source).toBe("MANUAL");
    expect(keptManual.account.currentBalance.toNumber()).toBe(0);
    expect(keptManual.merchantName).toBe("User entry");
    expect(keptManual.amount.toNumber()).toBe(7);
    expect(await prisma.transaction.findUnique({ where: { id: unrelated.id } })).not.toBeNull();
    expect(await prisma.recurringTransaction.count({ where: { userId: owner.id } })).toBe(0);
    expect(await prisma.nudge.count({ where: { userId: owner.id } })).toBe(0);
    expect(await prisma.netWorthSnapshot.count({ where: { userId: owner.id } })).toBe(0);
    expect(await prisma.account.findUnique({ where: { id: partnerAccount.id } })).not.toBeNull();
    expect(await prisma.netWorthSnapshot.count({ where: { userId: partner.id } })).toBe(1);

    // Replay a provider snapshot fetched before the notification, in both
    // account saving and transaction reconciliation: neither may restore data.
    await expect(savePlaidAccounts(item, [first, second])).rejects.toMatchObject({ code: "SYNC_CONFLICT" });
    await expect(applyPlaidSyncBatch(item, map, { added: [], modified: [], removed: [] }, "stale", new Date())).rejects.toMatchObject({ code: "SYNC_CONFLICT" });
    const manualAccountId = keptManual.accountId;
    await revokePlaidData(item, first.account_id);
    expect((await prisma.transaction.findUniqueOrThrow({ where: { id: manual.id } })).accountId).toBe(manualAccountId);
    expect(await prisma.account.count({ where: { userId: owner.id, source: "MANUAL" } })).toBe(1);

    // Fresh provider-authorized accounts may sync; a full revocation removes
    // the remaining imports but leaves the saved manual ledger untouched.
    const current = await prisma.plaidItem.findUniqueOrThrow({ where: { id: item.id } });
    await savePlaidAccounts(current, [second]);
    await detectRecurringForUser(owner.id);
    expect(await snapshotUserNetWorth(owner.id)).toBe(100);
    await revokePlaidData(current);
    expect(await prisma.account.count({ where: { userId: owner.id, source: "PLAID" } })).toBe(0);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(1);
    expect((await prisma.plaidItem.findUniqueOrThrow({ where: { id: item.id } })).errorCode).toBe("USER_PERMISSION_REVOKED");
    expect(await snapshotUserNetWorth(owner.id)).toBe(0);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, partner.id] } } });
  }
});

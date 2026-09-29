import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@worthlane/db";
import type { AccountBase } from "plaid";
import { revokePlaidData } from "../src/lib/plaid-revocation";
import { savePlaidAccounts, reconcilePlaidAccountSnapshot } from "../src/lib/plaid-accounts";
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

it("purges deselected accounts without a webhook and rejects superseded complete snapshots", async () => {
  const suffix = randomUUID();
  const owner = await prisma.user.create({ data: { email: `selection-${suffix}@worthlane.local`, passwordHash: "unusable" } });
  const partner = await prisma.user.create({ data: { email: `selection-partner-${suffix}@worthlane.local`, passwordHash: "unusable" } });
  try {
    const item = await prisma.plaidItem.create({ data: { userId: owner.id, itemId: `selection-${suffix}`, accessTokenEncrypted: "unused" } });
    const bank = (id: string): AccountBase => ({ account_id: `${suffix}-${id}`, name: "Synthetic", type: "investment", subtype: "ira", balances: { current: 100, available: null, limit: null, iso_currency_code: "USD", unofficial_currency_code: null } });
    const first = bank("first"), second = bank("second");
    const map = await savePlaidAccounts(item, [first, second]);
    const firstId = map.get(first.account_id)!, secondId = map.get(second.account_id)!;
    const imported = await prisma.transaction.create({ data: { userId: owner.id, accountId: firstId, amount: 20, date: new Date(), plaidTransactionId: `selection-import-${suffix}` } });
    const manual = await prisma.transaction.create({ data: { userId: owner.id, accountId: firstId, amount: 7, date: new Date(), isManual: true } });
    const retained = await prisma.transaction.create({ data: { userId: owner.id, accountId: secondId, amount: 9, date: new Date(), plaidTransactionId: `selection-retained-${suffix}` } });
    const other = await prisma.account.create({ data: { userId: partner.id, name: "Partner", type: "CHECKING", currentBalance: 50 } });
    await snapshotUserNetWorth(owner.id);
    await snapshotUserNetWorth(partner.id);

    const foreign = bank("foreign");
    await prisma.account.create({ data: { userId: partner.id, name: "Partner bank", source: "PLAID", type: "INVESTMENT", currentBalance: 1, plaidAccountId: foreign.account_id } });
    await expect(reconcilePlaidAccountSnapshot(item, [foreign, second], [foreign, second])).rejects.toMatchObject({ code: "PLAID_ACCOUNT_ALREADY_LINKED" });
    expect(await prisma.account.findUnique({ where: { id: firstId } })).not.toBeNull();
    expect(await prisma.transaction.findUnique({ where: { id: imported.id } })).not.toBeNull();
    expect((await prisma.plaidItem.findUniqueOrThrow({ where: { id: item.id } })).consentRevision).toBe(0);

    const selected = await reconcilePlaidAccountSnapshot(item, [second], [second]);
    expect(selected.consentRevision).toBe(1);
    expect(selected.accountMap.get(second.account_id)).toBe(secondId);
    expect(await prisma.account.findUnique({ where: { id: firstId } })).toBeNull();
    expect(await prisma.transaction.findUnique({ where: { id: imported.id } })).toBeNull();
    const saved = await prisma.transaction.findUniqueOrThrow({ where: { id: manual.id }, include: { account: true } });
    expect(saved.amount.toNumber()).toBe(7);
    expect(saved.account.source).toBe("MANUAL");
    expect(await prisma.householdAccountAccess.count({ where: { accountId: saved.accountId } })).toBe(0);
    expect(saved.account.currentBalance.toNumber()).toBe(0);
    expect(await prisma.transaction.findUnique({ where: { id: retained.id } })).not.toBeNull();
    expect(await prisma.account.findUnique({ where: { id: other.id } })).not.toBeNull();
    expect(await prisma.netWorthSnapshot.count({ where: { userId: owner.id } })).toBe(0);
    expect(await prisma.netWorthSnapshot.count({ where: { userId: partner.id } })).toBe(1);
    await expect(reconcilePlaidAccountSnapshot(item, [first, second], [first, second])).rejects.toMatchObject({ code: "SYNC_CONFLICT" });
    await expect(applyPlaidSyncBatch(item, map, { added: [], modified: [], removed: [] }, "old", new Date())).rejects.toMatchObject({ code: "SYNC_CONFLICT" });

    const current = await prisma.plaidItem.findUniqueOrThrow({ where: { id: item.id } });
    const repeated = await reconcilePlaidAccountSnapshot(current, [second], [second]);
    expect(repeated.accountMap.get(second.account_id)).toBe(secondId);
    expect(await prisma.account.count({ where: { userId: owner.id, source: "MANUAL" } })).toBe(1);
    const latest = await prisma.plaidItem.findUniqueOrThrow({ where: { id: item.id } });
    await reconcilePlaidAccountSnapshot(latest, [], []);
    expect(await prisma.account.count({ where: { userId: owner.id, source: "PLAID" } })).toBe(0);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(1);
    await expect(reconcilePlaidAccountSnapshot(latest, [second], [second])).rejects.toMatchObject({ code: "SYNC_CONFLICT" });
    const empty = await prisma.plaidItem.findUniqueOrThrow({ where: { id: item.id } });
    await reconcilePlaidAccountSnapshot(empty, [], []);
    await expect(reconcilePlaidAccountSnapshot(empty, [first], [first])).rejects.toMatchObject({ code: "SYNC_CONFLICT" });
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, partner.id] } } });
  }
});

import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { Products } from "plaid";
import { prisma } from "@worthlane/db";
import { plaidClient, decryptPlaidAccessToken } from "../src/lib/plaid";
import { POST as register } from "../src/app/api/auth/register/route";
import { POST as exchange } from "../src/app/api/plaid/exchange/route";
import { POST as sync } from "../src/app/api/plaid/sync/route";
import { POST as linkToken } from "../src/app/api/plaid/link-token/route";
import { POST as unlink } from "../src/app/api/plaid/items/[id]/unlink/route";
import { POST as liabilities } from "../src/app/api/plaid/items/[id]/liabilities/route";
import { GET as accounts } from "../src/app/api/accounts/route";

function req(token: string | undefined, body: unknown) {
  return new NextRequest("http://localhost/api/sandbox", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
}
async function data(response: Response, status = 200) {
  expect(response.status).toBe(status);
  return (await response.json()).data;
}
afterAll(() => prisma.$disconnect());

it("persists encrypted Sandbox Items, repeats sync, isolates owners, records relink errors and unlinks", async () => {
  let cleanupToken: string | undefined;
  let stage = "registration and exchange";
  try {
    const session = await data(await register(req(undefined, { email: `sandbox-${randomUUID()}@worthlane.local`, password: "Synthetic-sandbox-passphrase!2026" })), 201);
    const stranger = await data(await register(req(undefined, { email: `other-${randomUUID()}@worthlane.local`, password: "Synthetic-sandbox-passphrase!2026" })), 201);
    const created = await plaidClient.sandboxPublicTokenCreate({ institution_id: "ins_109508", initial_products: [Products.Transactions, Products.Liabilities] });
    const linked = await data(await exchange(req(session.accessToken, { publicToken: created.data.public_token, institutionName: "Synthetic Sandbox Bank" })), 201);
    const item = await prisma.plaidItem.findUniqueOrThrow({ where: { id: linked.plaidItem.id } });
    cleanupToken = decryptPlaidAccessToken(item.accessTokenEncrypted);
    expect(item.accessTokenEncrypted.startsWith("access-")).toBe(false);
    expect(item.userId).toBe(session.user.id);
    expect(await prisma.account.count({ where: { userId: session.user.id } })).toBeGreaterThan(0);
    stage = "owner isolation";
    await data(await sync(req(stranger.accessToken, { plaidItemId: item.id })), 404);
    await data(await linkToken(req(stranger.accessToken, { platform: "web", mode: "update", plaidItemId: item.id })), 404);
    await data(await unlink(req(stranger.accessToken, {}), { params: { id: item.id } }), 404);
    stage = "liability fields and owner isolation";
    await data(await liabilities(req(stranger.accessToken, {}), { params: { id: item.id } }), 404);
    let liabilityData: any;
    for (let attempt = 0; attempt < 15; attempt++) {
      const response = await liabilities(req(session.accessToken, {}), { params: { id: item.id } });
      if (response.status === 200) { liabilityData = await data(response); break; }
      const failure = await response.json();
      if (failure.error?.code !== "PRODUCT_NOT_READY") {
        const safeCode = /^[A-Z_]+$/.test(failure.error?.code ?? "") ? failure.error.code : "UNKNOWN";
        stage = `liabilities response ${response.status} ${safeCode}`; throw new Error("Liabilities unavailable");
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    stage = "liabilities source and debt count";
    expect(liabilityData.source).toBe("PLAID_LIABILITIES");
    expect(liabilityData.debts.length).toBeGreaterThan(0);
    const card = liabilityData.debts.find((debt: any) => debt.kind === "CREDIT_CARD");
    stage = "liabilities card present";
    expect(card).toBeDefined();
    stage = "liabilities statement balance present";
    expect(card.statementBalanceMinor).not.toBeNull();
    stage = "liabilities minimum present";
    expect(card.minimumPaymentMinor).not.toBeNull();
    stage = "liabilities due date present";
    expect(card.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    stage = "liabilities rates present";
    expect(card.rates.length).toBeGreaterThan(0);
    expect(JSON.stringify(liabilityData)).not.toContain(cleanupToken);
    let count = 0;
    stage = "transaction sync and replay";
    for (let attempt = 0; attempt < 15; attempt++) {
      await data(await sync(req(session.accessToken, { plaidItemId: item.id, refresh: false })));
      count = await prisma.transaction.count({ where: { userId: session.user.id } });
      if (count > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    expect(count).toBeGreaterThan(0);
    await data(await sync(req(session.accessToken, { plaidItemId: item.id, refresh: false })));
    expect(await prisma.transaction.count({ where: { userId: session.user.id } })).toBe(count);
    const connection = (await data(await accounts(req(session.accessToken, {})))).plaidItems[0];
    expect(["UNKNOWN", "NOT_READY", "INITIAL_UPDATE_COMPLETE", "HISTORICAL_UPDATE_COMPLETE"]).toContain(connection.transactionHistoryStatus);
    expect(connection.dataNotice.length).toBeGreaterThan(0);
    expect((await data(await accounts(req(stranger.accessToken, {})))).plaidItems).toHaveLength(0);
    stage = "login required and update token";
    await plaidClient.sandboxItemResetLogin({ access_token: cleanupToken });
    await data(await sync(req(session.accessToken, { plaidItemId: item.id })), 409);
    const failed = await prisma.plaidItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(failed.needsRelink).toBe(true);
    expect(failed.errorCode).toBe("ITEM_LOGIN_REQUIRED");
    const update = await data(await linkToken(req(session.accessToken, { platform: "web", mode: "update", plaidItemId: item.id })));
    expect(Boolean(update.linkToken)).toBe(true);
    stage = "unlink cleanup";
    await data(await unlink(req(session.accessToken, {}), { params: { id: item.id } }));
    cleanupToken = undefined;
    expect(await prisma.plaidItem.count({ where: { userId: session.user.id } })).toBe(0);
    expect(await prisma.account.count({ where: { userId: session.user.id } })).toBe(0);
    expect(await prisma.transaction.count({ where: { userId: session.user.id } })).toBe(0);
  } catch (error) {
    // Never let Axios/Vitest print request headers, public/access tokens or DB rows.
    const code = (error as { response?: { data?: { error_code?: string } } }).response?.data?.error_code;
    throw new Error(`Sandbox application check failed at ${stage} (${code && /^[A-Z_]+$/.test(code) ? code : "assertion or request failure"}).`);
  } finally {
    if (cleanupToken) {
      try { await plaidClient.itemRemove({ access_token: cleanupToken }); }
      catch { throw new Error("Task-created Sandbox Item cleanup failed."); }
    }
  }
});

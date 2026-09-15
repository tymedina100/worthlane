import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { Products } from "plaid";
import { prisma } from "@worthlane/db";
import { signAccessToken } from "../src/lib/auth";
import { plaidClient, decryptPlaidAccessToken } from "../src/lib/plaid";
import { POST as exchange } from "../src/app/api/plaid/exchange/route";
import { DELETE as deleteAccount } from "../src/app/api/auth/account/route";

afterAll(() => prisma.$disconnect());

it("revokes a real Sandbox Item before persisting account deletion", async () => {
  let userId: string | undefined;
  let cleanupToken: string | undefined;
  let stage = "synthetic user creation";
  try {
    const user = await prisma.user.create({ data: {
      email: `delete-sandbox-${randomUUID()}@worthlane.local`, passwordHash: "synthetic-not-a-login-hash",
    } });
    userId = user.id;
    const authorization = `Bearer ${signAccessToken({ sub: user.id, email: user.email })}`;
    stage = "Sandbox exchange";
    const created = await plaidClient.sandboxPublicTokenCreate({ institution_id: "ins_109508", initial_products: [Products.Transactions] });
    const response = await exchange(new NextRequest("http://localhost/api/plaid/exchange", {
      method: "POST", headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify({ publicToken: created.data.public_token, institutionName: "Deletion Sandbox Fixture" }),
    }));
    expect(response.status).toBe(201);
    const item = await prisma.plaidItem.findFirstOrThrow({ where: { userId } });
    cleanupToken = decryptPlaidAccessToken(item.accessTokenEncrypted);
    expect(await prisma.account.count({ where: { userId } })).toBeGreaterThan(0);
    stage = "account deletion";
    const deleted = await deleteAccount(new NextRequest("http://localhost/api/auth/account", { method: "DELETE", headers: { authorization } }));
    expect(deleted.status).toBe(200);
    stage = "provider revocation readback";
    let providerCode: string | undefined;
    try { await plaidClient.itemGet({ access_token: cleanupToken }); }
    catch (error) { providerCode = (error as { response?: { data?: { error_code?: string } } }).response?.data?.error_code; }
    expect(providerCode).toBe("ITEM_NOT_FOUND");
    cleanupToken = undefined;
    stage = "persisted deletion readback";
    await prisma.$disconnect();
    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
    expect(await prisma.plaidItem.count({ where: { userId } })).toBe(0);
    expect(await prisma.account.count({ where: { userId } })).toBe(0);
    expect(await prisma.transaction.count({ where: { userId } })).toBe(0);
  } catch {
    // SDK errors contain credentials; never allow raw request objects in output.
    throw new Error(`Sandbox account deletion failed at ${stage}.`);
  } finally {
    if (cleanupToken) {
      try { await plaidClient.itemRemove({ access_token: cleanupToken }); }
      catch { throw new Error("Task-created Sandbox deletion Item cleanup failed; local fixture retained."); }
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  }
});

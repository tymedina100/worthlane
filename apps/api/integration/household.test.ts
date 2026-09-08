import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
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
  it("registers solo, joins with consent, persists splits across login, and enforces account privacy", async () => {
    const owner = await newUser("owner");
    const partner = await newUser("partner");
    const outsider = await newUser("outsider");
    await call(summary, undefined, undefined, 401);
    const household = await call(createHousehold, owner.token, {
      name: "Synthetic household", displayName: "Alex", timezone: "America/Phoenix", currency: "USD",
    }, 201);
    const solo = await readSummary(owner.token);
    expect(solo.members).toHaveLength(1);
    expect(solo.household.id).toBe(household.householdId);
    await call(summary, partner.token, undefined, 404);
    await call(invite, owner.token, { email: partner.email, displayName: "Sam" }, 202);
    // An invitation is not consent and grants no data access.
    await call(summary, partner.token, undefined, 404);
    const pending = await call(invitations, partner.token);
    expect(pending).toHaveLength(1);
    const invitationId = pending[0].id;
    await call(accept, outsider.token, { invitationId }, 404);
    await call(accept, partner.token, { invitationId });
    const joined = await readSummary(partner.token);
    expect(joined.household.id).toBe(solo.household.id);
    expect(joined.members).toHaveLength(2);
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
    await setHouseholdAccountVisibility(owner.id, account.id, { visibility: "PERSONAL" });
    expect((await readSummary(partner.token)).finances.visibleNetWorthMinor).toBe(0);
    await expect(getHouseholdAccountDetail(partner.id, account.id)).rejects.toThrow("Account not found");
  });
});

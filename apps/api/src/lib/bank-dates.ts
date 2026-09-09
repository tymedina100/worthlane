import type { Prisma } from "@worthlane/db";

// Called within onboarding's transaction: bank calendar dates follow the new
// household zone, while manually entered timestamps remain unchanged.
export async function rebaseBankDates(db: Prisma.TransactionClient, userId: string) {
  await db.$executeRaw`UPDATE "Transaction" t SET "date" = (t."bankDate"::timestamp AT TIME ZONE COALESCE((
    SELECT h."timezone" FROM "HouseholdMember" m JOIN "Household" h ON h.id = m."householdId"
    WHERE m."userId" = t."userId" AND m.status = 'ACTIVE' LIMIT 1
  ), 'UTC')) AT TIME ZONE 'UTC' WHERE t."userId" = ${userId} AND t."bankDate" IS NOT NULL`;
}

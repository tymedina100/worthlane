ALTER TABLE "Transaction" ADD COLUMN "bankDate" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "treatmentOverridden" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Transaction" SET "bankDate" = to_char("date", 'YYYY-MM-DD'), "treatmentOverridden" = true
WHERE "plaidTransactionId" IS NOT NULL;
UPDATE "Transaction" t SET "date" = (t."bankDate"::timestamp AT TIME ZONE COALESCE((
  SELECT h."timezone" FROM "HouseholdMember" m JOIN "Household" h ON h.id = m."householdId"
  WHERE m."userId" = t."userId" AND m.status = 'ACTIVE' LIMIT 1
), 'UTC')) AT TIME ZONE 'UTC' WHERE t."bankDate" IS NOT NULL;

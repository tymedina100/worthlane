CREATE TABLE "HouseholdAccountMatch" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "firstAccountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "secondAccountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "firstConfirmedAt" TIMESTAMP(3),
  "secondConfirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "account_match_sorted_pair" CHECK ("firstAccountId" < "secondAccountId")
);
CREATE UNIQUE INDEX "HouseholdAccountMatch_householdId_firstAccountId_secondAccount_key" ON "HouseholdAccountMatch"("householdId", "firstAccountId", "secondAccountId");
CREATE INDEX "HouseholdAccountMatch_householdId_idx" ON "HouseholdAccountMatch"("householdId");

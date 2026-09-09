CREATE TABLE "DebtPlan" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "startMonth" TEXT NOT NULL, "strategy" TEXT NOT NULL, "monthlyPayment" DECIMAL(12,2) NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "DebtPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DebtPlan_userId_createdAt_idx" ON "DebtPlan"("userId", "createdAt");
CREATE TABLE "DebtPlanEntry" (
 "id" TEXT NOT NULL PRIMARY KEY, "planId" TEXT NOT NULL, "entryId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "balance" DECIMAL(12,2) NOT NULL, "minimumPayment" DECIMAL(12,2) NOT NULL, "statementBalance" DECIMAL(12,2),
 "dueDate" TEXT, "aprBasisPoints" INTEGER NOT NULL, "promoAprBasisPoints" INTEGER, "promoExpiresOn" TEXT,
 "position" INTEGER NOT NULL,
 CONSTRAINT "DebtPlanEntry_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DebtPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DebtPlanEntry_planId_entryId_key" ON "DebtPlanEntry"("planId", "entryId");

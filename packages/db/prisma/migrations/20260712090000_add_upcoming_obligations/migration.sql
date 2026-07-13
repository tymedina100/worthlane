-- Manual-first upcoming bills, card payments, subscriptions, and other obligations.
CREATE TYPE "UpcomingObligationType" AS ENUM ('BILL', 'CREDIT_CARD', 'SUBSCRIPTION', 'OTHER');

CREATE TABLE "UpcomingObligation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "dueDate" DATE NOT NULL,
  "type" "UpcomingObligationType" NOT NULL DEFAULT 'BILL',
  "frequency" "RecurringFrequency",
  "accountName" TEXT,
  "reminderTiming" TEXT,
  "isPaid" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastPaidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UpcomingObligation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UpcomingObligation_userId_dueDate_idx" ON "UpcomingObligation"("userId", "dueDate");
CREATE INDEX "UpcomingObligation_userId_isPaid_dueDate_idx" ON "UpcomingObligation"("userId", "isPaid", "dueDate");

ALTER TABLE "UpcomingObligation"
  ADD CONSTRAINT "UpcomingObligation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

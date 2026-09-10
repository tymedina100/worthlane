CREATE TABLE "HouseholdResponsibilityHistory" (
  "id" TEXT NOT NULL,
  "responsibilityId" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "definition" JSONB NOT NULL,
  CONSTRAINT "HouseholdResponsibilityHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HouseholdResponsibilityHistory_responsibilityId_recordedAt_id_idx"
  ON "HouseholdResponsibilityHistory"("responsibilityId", "recordedAt", "id");
ALTER TABLE "HouseholdResponsibilityHistory" ADD CONSTRAINT "HouseholdResponsibilityHistory_responsibilityId_fkey"
  FOREIGN KEY ("responsibilityId") REFERENCES "HouseholdResponsibility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

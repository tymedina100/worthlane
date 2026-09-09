ALTER TABLE "UpcomingObligation" ADD COLUMN "sourceKey" TEXT;
CREATE UNIQUE INDEX "UpcomingObligation_sourceKey_key" ON "UpcomingObligation"("sourceKey");

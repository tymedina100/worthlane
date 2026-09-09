ALTER TABLE "UpcomingObligation" ADD COLUMN "anchorDay" INTEGER;
UPDATE "UpcomingObligation" SET "anchorDay" = EXTRACT(DAY FROM "dueDate")::integer;
ALTER TABLE "UpcomingObligation" ADD CONSTRAINT "UpcomingObligation_anchorDay_check" CHECK ("anchorDay" BETWEEN 1 AND 31);

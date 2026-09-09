ALTER TABLE "Transaction" ADD COLUMN "categoryOverridden" BOOLEAN NOT NULL DEFAULT false;
-- Older imports did not record whether their category was edited. Preserve
-- existing categorized rows instead of guessing and overwriting a user's work.
UPDATE "Transaction" SET "categoryOverridden" = true
WHERE "isManual" = false AND "categoryId" IS NOT NULL;

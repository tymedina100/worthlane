-- Optional client-declared review provenance. Existing manual plans are unchanged.
ALTER TABLE "DebtPlanEntry" ADD COLUMN "bankReference" JSONB;

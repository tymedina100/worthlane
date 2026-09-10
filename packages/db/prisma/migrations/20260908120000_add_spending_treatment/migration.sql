-- Conservative upgrade: existing credits remain non-spending until confirmed
-- as refunds. Transfers and repayments can be explicitly excluded by the owner.
CREATE TYPE "SpendingTreatment" AS ENUM ('AUTO', 'REFUND', 'EXCLUDED');
ALTER TABLE "Transaction" ADD COLUMN "spendingTreatment" "SpendingTreatment" NOT NULL DEFAULT 'AUTO';

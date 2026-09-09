ALTER TABLE "HouseholdMember" ADD COLUMN "invitedEmail" TEXT;
ALTER TABLE "HouseholdMember" ADD COLUMN "inviteTokenHash" TEXT;
CREATE UNIQUE INDEX "HouseholdMember_inviteTokenHash_key" ON "HouseholdMember"("inviteTokenHash");

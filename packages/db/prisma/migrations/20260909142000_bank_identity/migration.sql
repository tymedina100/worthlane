ALTER TABLE "Account" ADD COLUMN "bankIdentity" TEXT;
CREATE UNIQUE INDEX "Account_userId_bankIdentity_key" ON "Account"("userId", "bankIdentity");

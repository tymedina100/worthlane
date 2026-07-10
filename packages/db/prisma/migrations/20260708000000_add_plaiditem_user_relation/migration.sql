-- Sever any orphaned PlaidItem rows (no matching User) so the new foreign key
-- validates cleanly. Account deletion already removes PlaidItems, so this is a
-- defensive no-op on healthy data.
DELETE FROM "PlaidItem" WHERE "userId" NOT IN (SELECT "id" FROM "User");

-- AddForeignKey
ALTER TABLE "PlaidItem" ADD CONSTRAINT "PlaidItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

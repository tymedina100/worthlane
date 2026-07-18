import { NextRequest } from "next/server";
import { setHouseholdIncomeBasesSchema } from "@worthlane/contracts";
import { getAuthUser } from "@/lib/auth";
import { setHouseholdIncomeBases } from "@/lib/household";
import { householdErrorResponse } from "@/lib/household-http";
import { err, ok, unauthorized } from "@/lib/response";

export async function PATCH(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }
  const parsed = setHouseholdIncomeBasesSchema.safeParse(
    await req.json().catch(() => null)
  );
  if (!parsed.success) return err("Invalid request body");
  try {
    return ok(await setHouseholdIncomeBases(userId, parsed.data));
  } catch (error) {
    return householdErrorResponse(
      error,
      "households/current/income-bases",
      "Unable to update household income bases",
      "HOUSEHOLD_INCOME_BASES_FAILED"
    );
  }
}

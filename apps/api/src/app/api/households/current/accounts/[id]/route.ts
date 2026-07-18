import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getHouseholdAccountDetail } from "@/lib/household";
import { householdErrorResponse } from "@/lib/household-http";
import { ok, unauthorized } from "@/lib/response";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  try {
    return ok(await getHouseholdAccountDetail(userId, params.id));
  } catch (error) {
    return householdErrorResponse(
      error,
      "households/current/accounts/detail",
      "Unable to load household account",
      "HOUSEHOLD_ACCOUNT_FAILED"
    );
  }
}

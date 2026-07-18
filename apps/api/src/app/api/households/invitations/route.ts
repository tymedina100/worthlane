import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { listHouseholdPartnerInvitations } from "@/lib/household";
import { householdErrorResponse } from "@/lib/household-http";
import { ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }
  try {
    return ok(await listHouseholdPartnerInvitations(userId));
  } catch (error) {
    return householdErrorResponse(
      error,
      "households/invitations",
      "Unable to load partner invitations",
      "HOUSEHOLD_INVITATIONS_FAILED"
    );
  }
}

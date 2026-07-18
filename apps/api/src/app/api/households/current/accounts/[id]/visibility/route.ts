import { NextRequest } from "next/server";
import { setHouseholdAccountVisibilitySchema } from "@worthlane/contracts";
import { getAuthUser } from "@/lib/auth";
import { setHouseholdAccountVisibility } from "@/lib/household";
import { householdErrorResponse } from "@/lib/household-http";
import { err, ok, unauthorized } from "@/lib/response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }
  const parsed = setHouseholdAccountVisibilitySchema.safeParse(
    await req.json().catch(() => null)
  );
  if (!parsed.success) return err("Invalid request body");

  try {
    return ok(
      await setHouseholdAccountVisibility(userId, params.id, parsed.data)
    );
  } catch (error) {
    return householdErrorResponse(
      error,
      "households/current/accounts/visibility",
      "Unable to update account visibility",
      "HOUSEHOLD_ACCOUNT_VISIBILITY_FAILED"
    );
  }
}
